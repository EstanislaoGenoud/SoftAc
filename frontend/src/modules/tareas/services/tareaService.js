const STORAGE_KEY_TAREAS = "softac_mock_tareas";
const STORAGE_KEY_ENTREGAS = "softac_mock_entregas";

export const ENTREGA_ESTADOS = {
  PENDIENTE: "PENDIENTE",
  ENTREGADO: "ENTREGADO",
  ENTREGADO_TARDE: "ENTREGADO_TARDE",
  NO_ENTREGADO: "NO_ENTREGADO"
};

function readTareas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_TAREAS) || "[]");
  } catch {
    return [];
  }
}

function writeTareas(tareas) {
  try {
    localStorage.setItem(STORAGE_KEY_TAREAS, JSON.stringify(tareas));
  } catch {
    // Si localStorage no está disponible en el entorno, no bloqueamos la ejecución en memoria
  }
}

function readEntregas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ENTREGAS) || "[]");
  } catch {
    return [];
  }
}

function writeEntregas(entregas) {
  try {
    localStorage.setItem(STORAGE_KEY_ENTREGAS, JSON.stringify(entregas));
  } catch {
    // Si localStorage no está disponible en el entorno, no bloqueamos la ejecución en memoria
  }
}

/**
 * Valida formato de fecha YYYY-MM-DD y que represente una fecha de calendario real
 */
export function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Determina si una tarea está vencida comparando su fecha de entrega contra hoy
 * @param {string} fechaEntrega - Formato YYYY-MM-DD
 * @param {string} [fechaReferencia] - Fecha opcional para pruebas YYYY-MM-DD
 */
export function isTareaVencida(fechaEntrega, fechaReferencia) {
  if (!fechaEntrega || !isValidDateFormat(fechaEntrega)) return false;
  let todayStr = fechaReferencia;
  if (!todayStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    todayStr = `${y}-${m}-${d}`;
  }
  return fechaEntrega < todayStr;
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY
 */
export function formatFecha(fechaStr) {
  if (!fechaStr) return "-";
  const clean = fechaStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fechaStr;
}

/**
 * Valida los datos requeridos para registrar una tarea
 */
export function validateTareaData(data, existingTareas = []) {
  if (!data || typeof data !== "object") {
    throw new Error("Los datos de la tarea son inválidos.");
  }

  const cursoId = data.cursoId ? String(data.cursoId).trim() : "";
  if (!cursoId) {
    throw new Error("El curso es obligatorio.");
  }

  const titulo = data.titulo ? String(data.titulo).trim() : "";
  if (!titulo) {
    throw new Error("El título de la tarea es obligatorio.");
  }
  if (titulo.length > 120) {
    throw new Error("El título no puede superar los 120 caracteres.");
  }

  const fechaEntrega = data.fechaEntrega ? String(data.fechaEntrega).trim() : "";
  if (!fechaEntrega) {
    throw new Error("La fecha de entrega es obligatoria.");
  }
  if (!isValidDateFormat(fechaEntrega)) {
    throw new Error("La fecha de entrega debe tener un formato válido (AAAA-MM-DD).");
  }

  const descripcion = data.descripcion ? String(data.descripcion).trim() : "";

  // Verificación de duplicados en el mismo curso (mismo título y misma fecha)
  const isDuplicate = existingTareas.some(
    (t) =>
      String(t.cursoId) === cursoId &&
      t.titulo.trim().toLowerCase() === titulo.toLowerCase() &&
      t.fechaEntrega === fechaEntrega
  );

  if (isDuplicate) {
    throw new Error("Ya existe una tarea con ese título y fecha de entrega en este curso.");
  }

  return {
    cursoId,
    titulo,
    fechaEntrega,
    descripcion
  };
}

/**
 * Consulta todas las tareas asociadas a un curso
 */
export async function getTareasByCurso(cursoId) {
  const tareas = readTareas();
  return tareas
    .filter((t) => String(t.cursoId) === String(cursoId))
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
}

/**
 * Registra una nueva tarea (#311 HU-28)
 */
export async function createTarea(data) {
  const allTareas = readTareas();
  const validData = validateTareaData(data, allTareas);

  const nuevaTarea = {
    id: `mock-tarea-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    cursoId: validData.cursoId,
    titulo: validData.titulo,
    descripcion: validData.descripcion,
    fechaEntrega: validData.fechaEntrega,
    createdAt: new Date().toISOString(),
    _isMock: true
  };

  const updatedTareas = [nuevaTarea, ...allTareas];
  writeTareas(updatedTareas);
  return nuevaTarea;
}

/**
 * Obtiene una tarea por su ID
 */
export async function getTareaById(tareaId) {
  const tareas = readTareas();
  return tareas.find((t) => String(t.id) === String(tareaId)) || null;
}

/* =========================================================================
   #321 HU-29: REGISTRAR ENTREGA DE TAREA
   ========================================================================= */

/**
 * Determina el estado efectivo de la entrega de un alumno.
 * Si no hay registro explícito o es PENDIENTE y la tarea ya venció,
 * se computa automáticamente como NO_ENTREGADO.
 */
export function calcularEstadoEntrega(entrega, tarea, fechaReferencia) {
  const estadoGuardado = entrega?.estado;

  if (
    estadoGuardado === ENTREGA_ESTADOS.ENTREGADO ||
    estadoGuardado === ENTREGA_ESTADOS.ENTREGADO_TARDE
  ) {
    return estadoGuardado;
  }

  if (estadoGuardado === ENTREGA_ESTADOS.NO_ENTREGADO) {
    return ENTREGA_ESTADOS.NO_ENTREGADO;
  }

  // Si no se registró o está marcado PENDIENTE, verificamos si venció
  if (isTareaVencida(tarea?.fechaEntrega, fechaReferencia)) {
    return ENTREGA_ESTADOS.NO_ENTREGADO;
  }

  return ENTREGA_ESTADOS.PENDIENTE;
}

/**
 * Resumen cuantitativo de entregas para una tarea
 */
export function summarizeEntregas(tarea, students = [], entregasMap = {}, fechaReferencia) {
  let entregados = 0;
  let entregadosATiempo = 0;
  let entregadosTarde = 0;
  let pendientes = 0;
  let noEntregados = 0;

  for (const student of students) {
    const studentId = String(student.id ?? student.alumnoId);
    const entrega = entregasMap[studentId];
    const estado = calcularEstadoEntrega(entrega, tarea, fechaReferencia);

    switch (estado) {
      case ENTREGA_ESTADOS.ENTREGADO:
        entregados++;
        entregadosATiempo++;
        break;
      case ENTREGA_ESTADOS.ENTREGADO_TARDE:
        entregados++;
        entregadosTarde++;
        break;
      case ENTREGA_ESTADOS.NO_ENTREGADO:
        noEntregados++;
        break;
      case ENTREGA_ESTADOS.PENDIENTE:
      default:
        pendientes++;
        break;
    }
  }

  const total = students.length;
  const porcentajeCumplimiento =
    total > 0 ? Math.round((entregados / total) * 100) : 0;

  return {
    total,
    entregados,
    entregadosATiempo,
    entregadosTarde,
    pendientes,
    noEntregados,
    porcentajeCumplimiento
  };
}

/**
 * Obtiene todas las entregas registradas para una tarea específica
 * Retorna un mapa indexado por alumnoId
 */
export async function getEntregasByTarea(tareaId) {
  const allEntregas = readEntregas();
  const idStr = String(tareaId);

  return allEntregas
    .filter((e) => String(e.tareaId) === idStr)
    .reduce((acc, curr) => {
      acc[String(curr.alumnoId)] = curr;
      return acc;
    }, {});
}

/**
 * Registra o modifica el estado de entrega de un alumno (#321 HU-29)
 */
export async function saveEntrega({
  tareaId,
  alumnoId,
  estado,
  observacion = "",
  fechaEntregaReal
}) {
  if (!tareaId || !alumnoId) {
    throw new Error("Tarea y Alumno son obligatorios.");
  }

  const validEstados = Object.values(ENTREGA_ESTADOS);
  if (!validEstados.includes(estado)) {
    throw new Error(`Estado de entrega inválido: ${estado}`);
  }

  const allEntregas = readEntregas();
  const tid = String(tareaId);
  const aid = String(alumnoId);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const existingIndex = allEntregas.findIndex(
    (e) => String(e.tareaId) === tid && String(e.alumnoId) === aid
  );

  const updatedRecord = {
    id:
      existingIndex >= 0
        ? allEntregas[existingIndex].id
        : `mock-entrega-${tid}-${aid}`,
    tareaId: tid,
    alumnoId: aid,
    estado,
    observacion: typeof observacion === "string" ? observacion.trim() : "",
    fechaEntregaReal:
      fechaEntregaReal ||
      (estado === ENTREGA_ESTADOS.ENTREGADO || estado === ENTREGA_ESTADOS.ENTREGADO_TARDE
        ? todayStr
        : null),
    updatedAt: now.toISOString(),
    _isMock: true
  };

  if (existingIndex >= 0) {
    allEntregas[existingIndex] = updatedRecord;
  } else {
    allEntregas.push(updatedRecord);
  }

  writeEntregas(allEntregas);
  return updatedRecord;
}

/**
 * Permite marcar o modificar entregas de forma masiva
 */
export async function saveEntregasBatch(tareaId, registros = []) {
  if (!tareaId) throw new Error("La tarea es obligatoria.");

  const allEntregas = readEntregas();
  const tid = String(tareaId);
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const mapaExistentes = new Map(
    allEntregas.map((e, idx) => [`${e.tareaId}_${e.alumnoId}`, idx])
  );

  for (const reg of registros) {
    const aid = String(reg.alumnoId);
    const key = `${tid}_${aid}`;
    const estado = reg.estado || ENTREGA_ESTADOS.ENTREGADO;

    const record = {
      id: `mock-entrega-${tid}-${aid}`,
      tareaId: tid,
      alumnoId: aid,
      estado,
      observacion: reg.observacion || "",
      fechaEntregaReal: reg.fechaEntregaReal || todayStr,
      updatedAt: now.toISOString(),
      _isMock: true
    };

    if (mapaExistentes.has(key)) {
      const idx = mapaExistentes.get(key);
      allEntregas[idx] = record;
    } else {
      allEntregas.push(record);
      mapaExistentes.set(key, allEntregas.length - 1);
    }
  }

  writeEntregas(allEntregas);
  return allEntregas.filter((e) => String(e.tareaId) === tid);
}

/**
 * Obtiene el historial de entregas de un alumno a lo largo de todas las tareas
 */
export async function getEntregasByAlumno(alumnoId) {
  const allEntregas = readEntregas();
  const aid = String(alumnoId);
  return allEntregas.filter((e) => String(e.alumnoId) === aid);
}

/**
 * Utilidades para testing
 */
export function setTareasMockData(tareas) {
  writeTareas(tareas);
}

export function setEntregasMockData(entregas) {
  writeEntregas(entregas);
}


/* =========================================================================
   #329 HU-30: VISUALIZAR TRABAJOS NO ENTREGADOS
   ========================================================================= */

/**
 * Calcula días transcurridos desde el vencimiento de una fecha
 */
export function calculateDaysOverdue(fechaEntrega, fechaReferencia) {
  if (!fechaEntrega || !isValidDateFormat(fechaEntrega)) return 0;
  const todayStr = fechaReferencia || new Date().toISOString().split("T")[0];
  if (fechaEntrega >= todayStr) return 0;
  const dEntrega = new Date(fechaEntrega + "T00:00:00");
  const dRef = new Date(todayStr + "T00:00:00");
  const diffTime = dRef - dEntrega;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * HU-30 (#329): Obtiene los trabajos no entregados de un conjunto de tareas y alumnos.
 * Un trabajo se considera "no entregado" si:
 * 1. Su estado registrado explícitamente es NO_ENTREGADO, o
 * 2. La tarea está vencida y el alumno no la entregó (estado PENDIENTE o sin registro).
 */
export function getTrabajosNoEntregados(
  students = [],
  tareas = [],
  entregasByTaskId = {},
  fechaReferencia
) {
  const noEntregados = [];

  for (const tarea of tareas) {
    const entregasMap = entregasByTaskId[tarea.id] || {};

    for (const student of students) {
      const studentId = String(student.id ?? student.alumnoId);
      const entrega = entregasMap[studentId];
      const estado = calcularEstadoEntrega(entrega, tarea, fechaReferencia);

      if (estado === ENTREGA_ESTADOS.NO_ENTREGADO) {
        const studentName =
          [student.nombre, student.apellido].filter(Boolean).join(" ") ||
          student.name ||
          "Alumno sin nombre";
        const studentDni = student.identificacion || student.dni || "";

        noEntregados.push({
          tareaId: tarea.id,
          tareaTitulo: tarea.titulo,
          fechaEntrega: tarea.fechaEntrega,
          alumnoId: studentId,
          alumnoNombre: studentName,
          alumnoDni: studentDni,
          diasVencida: calculateDaysOverdue(tarea.fechaEntrega, fechaReferencia),
          observacion: entrega?.observacion || ""
        });
      }
    }
  }

  // Ordenar por mayor cantidad de días vencidos primero
  return noEntregados.sort((a, b) => b.diasVencida - a.diasVencida);
}

/**
 * Consulta de conveniencia que carga tareas y entregas del curso desde almacenamiento
 */
export async function getTrabajosNoEntregadosByCurso(cursoId, students = [], fechaReferencia) {
  const tareas = await getTareasByCurso(cursoId);
  const entries = await Promise.all(
    tareas.map(async (t) => [t.id, await getEntregasByTarea(t.id)])
  );
  const entregasByTaskId = Object.fromEntries(entries);
  return getTrabajosNoEntregados(students, tareas, entregasByTaskId, fechaReferencia);
}
