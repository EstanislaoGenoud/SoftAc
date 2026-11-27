import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidDateFormat,
  isTareaVencida,
  formatFecha,
  validateTareaData,
  createTarea,
  getTareasByCurso,
  setTareasMockData,
  ENTREGA_ESTADOS,
  calcularEstadoEntrega,
  summarizeEntregas,
  saveEntrega,
  saveEntregasBatch,
  getEntregasByTarea,
  getEntregasByAlumno,
  setEntregasMockData,
  calculateDaysOverdue,
  getTrabajosNoEntregados,
  getTrabajosNoEntregadosByCurso
} from "../src/modules/tareas/services/tareaService.js";

// Mock básico de localStorage para entorno Node.js
if (typeof globalThis.localStorage === "undefined") {
  let store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
}

test("isValidDateFormat valida fechas YYYY-MM-DD reales", () => {
  assert.equal(isValidDateFormat("2026-11-23"), true);
  assert.equal(isValidDateFormat("2026-02-28"), true);
  assert.equal(isValidDateFormat("2026-02-29"), false); // 2026 no es bisiesto
  assert.equal(isValidDateFormat("23/11/2026"), false);
  assert.equal(isValidDateFormat("invalid"), false);
  assert.equal(isValidDateFormat(""), false);
  assert.equal(isValidDateFormat(null), false);
});

test("isTareaVencida determina si una fecha es anterior a la fecha de referencia", () => {
  const referencia = "2026-11-23";
  assert.equal(isTareaVencida("2026-11-20", referencia), true);
  assert.equal(isTareaVencida("2026-11-23", referencia), false); // Hoy no está vencida
  assert.equal(isTareaVencida("2026-11-25", referencia), false);
});

test("formatFecha convierte YYYY-MM-DD a DD/MM/YYYY", () => {
  assert.equal(formatFecha("2026-11-23"), "23/11/2026");
  assert.equal(formatFecha(""), "-");
  assert.equal(formatFecha(null), "-");
});

test("validateTareaData exige título obligatorio y trimmed", () => {
  assert.throws(
    () => validateTareaData({ cursoId: "curso-1", titulo: "   ", fechaEntrega: "2026-12-01" }),
    /El título de la tarea es obligatorio/
  );
});

test("validateTareaData exige fecha de entrega válida", () => {
  assert.throws(
    () => validateTareaData({ cursoId: "curso-1", titulo: "TP 1", fechaEntrega: "" }),
    /La fecha de entrega es obligatoria/
  );
  assert.throws(
    () => validateTareaData({ cursoId: "curso-1", titulo: "TP 1", fechaEntrega: "2026/12/01" }),
    /formato válido/
  );
});

test("validateTareaData previene duplicados en el mismo curso", () => {
  const existing = [
    {
      cursoId: "curso-1",
      titulo: "Trabajo Práctico 1",
      fechaEntrega: "2026-12-01"
    }
  ];

  assert.throws(
    () =>
      validateTareaData(
        { cursoId: "curso-1", titulo: "trabajo práctico 1", fechaEntrega: "2026-12-01" },
        existing
      ),
    /Ya existe una tarea con ese título y fecha de entrega/
  );

  // Mismo título pero en otro curso debe ser permitido
  assert.doesNotThrow(() =>
    validateTareaData(
      { cursoId: "curso-2", titulo: "Trabajo Práctico 1", fechaEntrega: "2026-12-01" },
      existing
    )
  );
});

test("HU-28 #311: createTarea persiste y getTareasByCurso recupera las tareas del curso", async () => {
  setTareasMockData([]);

  const tarea1 = await createTarea({
    cursoId: "c-100",
    titulo: "Ensayo histórico",
    descripcion: "Escribir sobre la revolución industrial",
    fechaEntrega: "2026-12-10"
  });

  const tarea2 = await createTarea({
    cursoId: "c-100",
    titulo: "Cuestionario de física",
    descripcion: "",
    fechaEntrega: "2026-11-30"
  });

  // Tarea de otro curso
  await createTarea({
    cursoId: "c-200",
    titulo: "TP Química",
    fechaEntrega: "2026-12-05"
  });

  assert.ok(tarea1.id);
  assert.ok(tarea2.id);
  assert.equal(tarea1.titulo, "Ensayo histórico");
  assert.equal(tarea1._isMock, true);

  const tareasCurso100 = await getTareasByCurso("c-100");
  assert.equal(tareasCurso100.length, 2);
  // Ordenadas por fecha de entrega ascendente
  assert.equal(tareasCurso100[0].titulo, "Cuestionario de física");
  assert.equal(tareasCurso100[1].titulo, "Ensayo histórico");

  const tareasCurso200 = await getTareasByCurso("c-200");
  assert.equal(tareasCurso200.length, 1);
});


test("HU-29 #321: calcularEstadoEntrega computa estado automático según vencimiento", () => {
  const tareaVigente = { fechaEntrega: "2026-12-01" };
  const tareaVencida = { fechaEntrega: "2026-11-20" };
  const ref = "2026-11-23";

  // Sin registro previo
  assert.equal(calcularEstadoEntrega(null, tareaVigente, ref), ENTREGA_ESTADOS.PENDIENTE);
  assert.equal(calcularEstadoEntrega(null, tareaVencida, ref), ENTREGA_ESTADOS.NO_ENTREGADO);

  // Registro explícito
  assert.equal(calcularEstadoEntrega({ estado: ENTREGA_ESTADOS.ENTREGADO }, tareaVencida, ref), ENTREGA_ESTADOS.ENTREGADO);
  assert.equal(calcularEstadoEntrega({ estado: ENTREGA_ESTADOS.ENTREGADO_TARDE }, tareaVencida, ref), ENTREGA_ESTADOS.ENTREGADO_TARDE);
  assert.equal(calcularEstadoEntrega({ estado: ENTREGA_ESTADOS.NO_ENTREGADO }, tareaVigente, ref), ENTREGA_ESTADOS.NO_ENTREGADO);
});

test("HU-29 #321: summarizeEntregas calcula correctamente el resumen", () => {
  const tarea = { fechaEntrega: "2026-11-20" }; // vencida
  const students = [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }];
  const entregasMap = {
    a1: { estado: ENTREGA_ESTADOS.ENTREGADO },
    a2: { estado: ENTREGA_ESTADOS.ENTREGADO_TARDE },
    a3: { estado: ENTREGA_ESTADOS.PENDIENTE } // al estar vencida, pasa a NO_ENTREGADO
    // a4 sin registro -> al estar vencida, pasa a NO_ENTREGADO
  };

  const summary = summarizeEntregas(tarea, students, entregasMap, "2026-11-23");
  assert.equal(summary.total, 4);
  assert.equal(summary.entregados, 2);
  assert.equal(summary.entregadosATiempo, 1);
  assert.equal(summary.entregadosTarde, 1);
  assert.equal(summary.noEntregados, 2);
  assert.equal(summary.porcentajeCumplimiento, 50);
});

test("HU-29 #321: saveEntrega permite registrar y modificar estado por alumno", async () => {
  setEntregasMockData([]);

  // 1. Guardar como entregado
  const e1 = await saveEntrega({
    tareaId: "t-1",
    alumnoId: "al-1",
    estado: ENTREGA_ESTADOS.ENTREGADO,
    observacion: "Entrega completa"
  });
  assert.equal(e1.estado, ENTREGA_ESTADOS.ENTREGADO);

  // 2. Modificar a entregado tarde
  const e2 = await saveEntrega({
    tareaId: "t-1",
    alumnoId: "al-1",
    estado: ENTREGA_ESTADOS.ENTREGADO_TARDE,
    observacion: "Entregó con 2 horas de retraso"
  });
  assert.equal(e2.estado, ENTREGA_ESTADOS.ENTREGADO_TARDE);
  assert.equal(e2.observacion, "Entregó con 2 horas de retraso");

  // Verificar mapa por tarea
  const mapa = await getEntregasByTarea("t-1");
  assert.ok(mapa["al-1"]);
  assert.equal(mapa["al-1"].estado, ENTREGA_ESTADOS.ENTREGADO_TARDE);

  // Verificar historial por alumno
  const entregasAlumno = await getEntregasByAlumno("al-1");
  assert.equal(entregasAlumno.length, 1);
  assert.equal(entregasAlumno[0].tareaId, "t-1");
});

test("HU-29 #321: saveEntregasBatch permite marcar masivamente", async () => {
  setEntregasMockData([]);

  await saveEntregasBatch("t-2", [
    { alumnoId: "al-1", estado: ENTREGA_ESTADOS.ENTREGADO },
    { alumnoId: "al-2", estado: ENTREGA_ESTADOS.ENTREGADO }
  ]);

  const mapa = await getEntregasByTarea("t-2");
  assert.equal(Object.keys(mapa).length, 2);
  assert.equal(mapa["al-1"].estado, ENTREGA_ESTADOS.ENTREGADO);
  assert.equal(mapa["al-2"].estado, ENTREGA_ESTADOS.ENTREGADO);
});


test("HU-30 #329: calculateDaysOverdue calcula días transcurridos correctamente", () => {
  const ref = "2026-11-23";
  assert.equal(calculateDaysOverdue("2026-11-20", ref), 3);
  assert.equal(calculateDaysOverdue("2026-11-23", ref), 0);
  assert.equal(calculateDaysOverdue("2026-11-25", ref), 0);
  assert.equal(calculateDaysOverdue("invalid", ref), 0);
});

test("HU-30 #329: getTrabajosNoEntregados extrae tareas vencidas sin entrega y omite entregados", () => {
  const ref = "2026-11-23";
  const students = [
    { id: "s1", nombre: "Juan", apellido: "Perez", identificacion: "111" },
    { id: "s2", nombre: "Ana", apellido: "Gomez", identificacion: "222" }
  ];
  const tareas = [
    { id: "t1", titulo: "TP 1", fechaEntrega: "2026-11-20" }, // vencida (3 días)
    { id: "t2", titulo: "TP 2", fechaEntrega: "2026-11-18" }, // vencida (5 días)
    { id: "t3", titulo: "TP 3", fechaEntrega: "2026-11-30" }  // vigente
  ];
  const entregasByTaskId = {
    t1: {
      s1: { estado: ENTREGA_ESTADOS.ENTREGADO } // entregado a tiempo
      // s2 no entregó en t1 -> NO ENTREGADO
    },
    t2: {
      s1: { estado: ENTREGA_ESTADOS.ENTREGADO_TARDE } // entregado tarde
      // s2 no entregó en t2 -> NO ENTREGADO
    },
    t3: {
      s1: { estado: ENTREGA_ESTADOS.NO_ENTREGADO } // marcado explícitamente en vigente
      // s2 pendiente en vigente -> no es NO_ENTREGADO todavía
    }
  };

  const adeudados = getTrabajosNoEntregados(students, tareas, entregasByTaskId, ref);

  // s2 debe t2 (5 días) y t1 (3 días). s1 debe t3 (marcado explícito).
  assert.equal(adeudados.length, 3);
  // Ordenado por mayor atraso primero
  assert.equal(adeudados[0].alumnoNombre, "Ana Gomez");
  assert.equal(adeudados[0].tareaTitulo, "TP 2");
  assert.equal(adeudados[0].diasVencida, 5);

  assert.equal(adeudados[1].alumnoNombre, "Ana Gomez");
  assert.equal(adeudados[1].tareaTitulo, "TP 1");
  assert.equal(adeudados[1].diasVencida, 3);

  assert.equal(adeudados[2].alumnoNombre, "Juan Perez");
  assert.equal(adeudados[2].tareaTitulo, "TP 3");
});
