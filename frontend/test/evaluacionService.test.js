import test from "node:test";
import assert from "node:assert/strict";

// Polyfill de localStorage para entorno Node.js
if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  };
}

import {
  EvaluacionApiError,
  createEvaluacion,
  getCalificacionesByEvaluacion,
  getConfiguracionEvaluacion,
  getEvaluacionesByCurso,
  getResumenAcademicoCurso,
  normalizeEvaluacion,
  saveCalificaciones,
  saveConfiguracionEvaluacion,
  validateGrade
} from "../src/modules/evaluaciones/services/evaluacionService.js";

const CURSO = "11111111-1111-4111-8111-111111111111";
const EVAL = "22222222-2222-4222-8222-222222222222";
const RECUP = "33333333-3333-4333-8333-333333333333";
const ALUMNO_A = "44444444-4444-4444-8444-444444444444";
const ALUMNO_B = "55555555-5555-4555-8555-555555555555";

const realFetch = globalThis.fetch;

/** Reemplaza fetch por un backend falso y registra las llamadas. */
function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const call = {
      path: url.replace("http://localhost:3000", ""),
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers
    };
    calls.push(call);
    const { status = 200, body = null } = handler(call) ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => (body === null ? "" : JSON.stringify(body))
    };
  };
  return calls;
}

function offlineFetch() {
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
}

test.beforeEach(() => {
  globalThis.localStorage.clear();
  globalThis.localStorage.setItem("token", "jwt-de-prueba");
});

test.after(() => {
  globalThis.fetch = realFetch;
});

test("normalizeEvaluacion convierte la entidad del backend al formato del frontend", () => {
  const result = normalizeEvaluacion({
    id: EVAL,
    curso_id: CURSO,
    nombre: "Parcial 1",
    tipo: "Examen",
    fecha: "2026-05-10",
    ponderacion: "40.00",
    descripcion: null,
    evaluacion_original_id: null,
    created_at: "2026-05-01T10:00:00.000Z"
  });

  assert.deepEqual(result, {
    id: EVAL,
    courseId: CURSO,
    nombre: "Parcial 1",
    tipo: "Examen",
    fecha: "2026-05-10",
    ponderacion: 40,
    descripcion: "",
    evaluacionOriginalId: null,
    createdAt: "2026-05-01T10:00:00.000Z"
  });
});

test("getEvaluacionesByCurso consulta la API con el token y normaliza", async () => {
  const calls = mockFetch(() => ({
    body: [
      { id: RECUP, curso_id: CURSO, nombre: "Recup 1", tipo: "Recuperatorio", fecha: "2026-05-20", ponderacion: "0.00", evaluacion_original_id: EVAL },
      { id: EVAL, curso_id: CURSO, nombre: "Parcial 1", tipo: "Examen", fecha: "2026-05-10", ponderacion: "100.00", evaluacion_original_id: null }
    ]
  }));

  const evaluations = await getEvaluacionesByCurso(CURSO);

  assert.equal(calls[0].path, `/evaluaciones/curso/${CURSO}`);
  assert.equal(calls[0].headers.Authorization, "Bearer jwt-de-prueba");
  assert.equal(evaluations.length, 2);
  assert.equal(evaluations[0].evaluacionOriginalId, EVAL);
  assert.equal(evaluations[1].ponderacion, 100);
});

test("createEvaluacion envía el DTO que espera el backend", async () => {
  const calls = mockFetch(({ body }) => ({
    status: 201,
    body: { id: EVAL, curso_id: body.cursoId, nombre: body.nombre, tipo: body.tipo, fecha: body.fecha, ponderacion: body.ponderacion, evaluacion_original_id: null }
  }));

  const created = await createEvaluacion({
    courseId: CURSO,
    nombre: "  Parcial 1  ",
    tipo: "Examen",
    fecha: "2026-05-10",
    ponderacion: "40",
    descripcion: "",
    evaluacionOriginalId: ""
  });

  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].path, "/evaluaciones");
  assert.deepEqual(calls[0].body, {
    cursoId: CURSO,
    nombre: "Parcial 1",
    tipo: "Examen",
    fecha: "2026-05-10",
    ponderacion: 40
  });
  assert.equal(created.id, EVAL);
  assert.equal(created.courseId, CURSO);
});

test("createEvaluacion manda ponderación 0 en recuperatorios", async () => {
  const calls = mockFetch(({ body }) => ({
    status: 201,
    body: { id: RECUP, curso_id: CURSO, ...body, evaluacion_original_id: body.evaluacionOriginalId }
  }));

  await createEvaluacion({
    courseId: CURSO,
    nombre: "Recuperatorio parcial 1",
    tipo: "Recuperatorio",
    fecha: "2026-05-20",
    ponderacion: "30",
    evaluacionOriginalId: EVAL
  });

  assert.equal(calls[0].body.ponderacion, 0);
  assert.equal(calls[0].body.evaluacionOriginalId, EVAL);
});

test("un error de validación del backend se muestra y no cae al respaldo local", async () => {
  mockFetch(() => ({
    status: 409,
    body: { statusCode: 409, message: "Ya existe una evaluación con ese nombre y fecha en el curso." }
  }));

  await assert.rejects(
    createEvaluacion({ courseId: CURSO, nombre: "Parcial 1", tipo: "Examen", fecha: "2026-05-10", ponderacion: 40 }),
    (error) => error instanceof EvaluacionApiError && error.status === 409 && /Ya existe/.test(error.message)
  );
  assert.equal(globalThis.localStorage.getItem("softac_mock_evaluaciones"), null);
});

test("los mensajes de validación en lista de Nest se unen en un texto", async () => {
  mockFetch(() => ({ status: 400, body: { message: ["fecha must be a valid ISO 8601 date string", "nombre should not be empty"] } }));

  await assert.rejects(
    createEvaluacion({ courseId: CURSO, nombre: "x", tipo: "Examen", fecha: "mal", ponderacion: 10 }),
    /fecha must be.*nombre should not be empty/
  );
});

test("si el servidor no responde, crea y lista la evaluación localmente", async () => {
  offlineFetch();

  const created = await createEvaluacion({ courseId: CURSO, nombre: "Oral", tipo: "Oral", fecha: "2026-06-01", ponderacion: 20 });
  const evaluations = await getEvaluacionesByCurso(CURSO);

  assert.equal(created._isMock, true);
  assert.equal(evaluations.length, 1);
  assert.equal(evaluations[0].nombre, "Oral");
});

test("un curso de datos de prueba (sin UUID) usa el almacenamiento local sin llamar a la API", async () => {
  const calls = mockFetch(() => ({ body: [] }));

  await createEvaluacion({ courseId: "1", nombre: "TP 1", tipo: "Trabajo práctico", fecha: "2026-04-01", ponderacion: 50 });
  const evaluations = await getEvaluacionesByCurso("1");

  assert.equal(calls.length, 0);
  assert.equal(evaluations.length, 1);
});

test("getCalificacionesByEvaluacion devuelve las notas como texto para los inputs", async () => {
  mockFetch(() => ({ body: { [ALUMNO_A]: 8.5, [ALUMNO_B]: 6 } }));

  const grades = await getCalificacionesByEvaluacion(EVAL);

  assert.deepEqual(grades, { [ALUMNO_A]: "8.5", [ALUMNO_B]: "6" });
});

test("saveCalificaciones envía solo las notas válidas como array y reporta las inválidas", async () => {
  const calls = mockFetch(({ body }) => ({ body: body.calificaciones }));

  const result = await saveCalificaciones(EVAL, { [ALUMNO_A]: "9.25", [ALUMNO_B]: "11", otro: "" }, "cuantitativo");

  assert.equal(calls[0].method, "PUT");
  assert.equal(calls[0].path, `/evaluaciones/${EVAL}/calificaciones`);
  assert.deepEqual(calls[0].body, {
    calificaciones: [{ alumnoId: ALUMNO_A, nota: 9.25, modelo: "cuantitativo" }]
  });
  assert.equal(result.saved.length, 1);
  assert.deepEqual(result.failed.map((item) => item.studentId), [ALUMNO_B]);
});

test("saveCalificaciones no llama a la API si no hay notas para guardar", async () => {
  const calls = mockFetch(() => ({ body: [] }));

  const result = await saveCalificaciones(EVAL, { [ALUMNO_A]: "" }, "cuantitativo");

  assert.equal(calls.length, 0);
  assert.deepEqual(result, { saved: [], failed: [] });
});

test("validateGrade aplica las mismas reglas que el backend", () => {
  assert.equal(validateGrade("7.55", "cuantitativo"), null);
  assert.match(validateGrade("7.555", "cuantitativo"), /dos decimales/);
  assert.match(validateGrade("0", "cuantitativo"), /entre 1 y 10/);
  assert.equal(validateGrade("Bueno", "cualitativo"), null);
  assert.match(validateGrade("Excelente", "cualitativo"), /Muy bueno/);
});

test("getConfiguracionEvaluacion traduce modo_recuperatorio", async () => {
  mockFetch(() => ({ body: { curso_id: CURSO, modelo: "cualitativo", modo_recuperatorio: "promedio" } }));

  const config = await getConfiguracionEvaluacion(CURSO);

  assert.deepEqual(config, { modelo: "cualitativo", modoRecuperatorio: "promedio" });
});

test("saveConfiguracionEvaluacion envía solo los campos cambiados", async () => {
  const calls = mockFetch(({ body }) => ({ body: { curso_id: CURSO, modelo: "cuantitativo", modo_recuperatorio: body.modoRecuperatorio } }));

  const config = await saveConfiguracionEvaluacion(CURSO, { modoRecuperatorio: "promedio" });

  assert.equal(calls[0].method, "PUT");
  assert.deepEqual(calls[0].body, { modoRecuperatorio: "promedio" });
  assert.equal(config.modoRecuperatorio, "promedio");
});

test("getResumenAcademicoCurso calcula promedios con la regla de recuperatorio del curso", async () => {
  mockFetch(({ path }) => {
    if (path === `/evaluaciones/curso/${CURSO}`) {
      return { body: [
        { id: RECUP, curso_id: CURSO, nombre: "Recup", tipo: "Recuperatorio", fecha: "2026-05-20", ponderacion: "0.00", evaluacion_original_id: EVAL },
        { id: EVAL, curso_id: CURSO, nombre: "Parcial", tipo: "Examen", fecha: "2026-05-10", ponderacion: "100.00", evaluacion_original_id: null }
      ] };
    }
    if (path.endsWith("/configuracion")) return { body: { modelo: "cuantitativo", modo_recuperatorio: "promedio" } };
    if (path === `/evaluaciones/${EVAL}/calificaciones`) return { body: { [ALUMNO_A]: 4 } };
    if (path === `/evaluaciones/${RECUP}/calificaciones`) return { body: { [ALUMNO_A]: 8 } };
    return { status: 404, body: { message: "No encontrado" } };
  });

  const resumen = await getResumenAcademicoCurso(CURSO, [ALUMNO_A, ALUMNO_B]);

  assert.equal(resumen.config.modoRecuperatorio, "promedio");
  assert.equal(resumen.averages[0].average, 6);
  assert.equal(resumen.averages[1].average, null);
});
