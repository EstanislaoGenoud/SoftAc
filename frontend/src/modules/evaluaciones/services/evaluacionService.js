/**
 * Servicio de evaluaciones y calificaciones (Sprint 4) conectado al backend.
 *
 * Endpoints usados (EvaluacionesController):
 *   GET  /evaluaciones/curso/:cursoId
 *   POST /evaluaciones
 *   GET  /evaluaciones/:id/calificaciones
 *   PUT  /evaluaciones/:id/calificaciones
 *   GET  /evaluaciones/curso/:cursoId/configuracion
 *   PUT  /evaluaciones/curso/:cursoId/configuracion
 *
 * Igual que clases y asistencias, si el servidor no responde (o el curso es de
 * datos de prueba, sin UUID) se usa el almacenamiento local del mock para que el
 * frontend siga siendo usable en desarrollo. Si el servidor responde con error
 * (validación, duplicado, 401), el error se propaga para mostrarlo al profesor.
 */
import {
  MOCK_EVALUATION_TYPES,
  MOCK_GRADING_CATEGORIES,
  RECOVERY_MODES,
  calculateStudentAverage,
  createEvaluacionMock,
  getCalificacionesByEvaluacion as getCalificacionesMock,
  getEvaluacionesByCurso as getEvaluacionesMock,
  getGradingConfigMock,
  getRecoveryConfigMock,
  numericToQualitative,
  qualitativeToNumeric,
  saveCalificacionesMock,
  saveGradingConfigMock,
  saveRecoveryConfigMock
} from "./evaluacionMockService.js";

export {
  RECOVERY_MODES,
  calculateStudentAverage,
  numericToQualitative,
  qualitativeToNumeric
};
export const EVALUATION_TYPES = MOCK_EVALUATION_TYPES;
export const GRADING_CATEGORIES = MOCK_GRADING_CATEGORIES;
export const GRADING_MODELS = { CUANTITATIVO: "cuantitativo", CUALITATIVO: "cualitativo" };
export const RECOVERY_TYPE = "Recuperatorio";

const API_URL = "http://localhost:3000";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El servidor respondió, pero con un error que hay que mostrar. */
export class EvaluacionApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "EvaluacionApiError";
    this.status = status;
  }
}

/** El servidor no está disponible: corresponde usar el respaldo local. */
class ServerUnavailableError extends Error {}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export function isServerId(id) {
  return UUID_PATTERN.test(String(id ?? ""));
}

function errorMessage(data, fallback) {
  if (Array.isArray(data?.message)) return data.message.join(" ");
  return data?.message || fallback;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: getAuthHeaders() });
  } catch (error) {
    throw new ServerUnavailableError(error.message);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new EvaluacionApiError(errorMessage(data, "Error del servidor de evaluaciones."), response.status);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Usa la API si el id es real; ante un servidor caído, ejecuta el respaldo local. */
async function withFallback(id, apiCall, localCall) {
  if (!isServerId(id)) return localCall();
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof ServerUnavailableError) {
      console.warn("Aviso API Evaluaciones (usando respaldo local):", error.message);
      return localCall();
    }
    throw error;
  }
}

/** Convierte la entidad del backend (snake_case) al formato que usan las pantallas. */
export function normalizeEvaluacion(evaluation) {
  return {
    id: String(evaluation.id),
    courseId: String(evaluation.curso_id ?? evaluation.courseId ?? ""),
    nombre: evaluation.nombre,
    tipo: evaluation.tipo,
    fecha: evaluation.fecha ? String(evaluation.fecha).slice(0, 10) : "",
    ponderacion: Number(evaluation.ponderacion || 0),
    descripcion: evaluation.descripcion || "",
    evaluacionOriginalId: evaluation.evaluacion_original_id ?? evaluation.evaluacionOriginalId ?? null,
    createdAt: evaluation.created_at ?? evaluation.createdAt ?? null,
    ...(evaluation._isMock ? { _isMock: true } : {})
  };
}

function toGradeStrings(grades) {
  return Object.fromEntries(
    Object.entries(grades || {}).map(([studentId, nota]) => [String(studentId), String(nota)])
  );
}

export async function getEvaluacionesByCurso(courseId) {
  const evaluations = await withFallback(
    courseId,
    () => request(`/evaluaciones/curso/${courseId}`),
    () => getEvaluacionesMock(courseId)
  );
  return (evaluations || []).map(normalizeEvaluacion);
}

export async function createEvaluacion(data) {
  const isRecovery = data.tipo === RECOVERY_TYPE;
  // El backend exige ponderación 0 en los recuperatorios: impactan sobre la original.
  const ponderacion = isRecovery ? 0 : Number(data.ponderacion);
  const payload = {
    cursoId: String(data.courseId),
    nombre: String(data.nombre || "").trim(),
    tipo: data.tipo,
    fecha: data.fecha,
    descripcion: data.descripcion?.trim() || undefined,
    ponderacion,
    evaluacionOriginalId: isRecovery ? data.evaluacionOriginalId : undefined
  };

  const created = await withFallback(
    data.courseId,
    () => request("/evaluaciones", { method: "POST", body: JSON.stringify(payload) }),
    () => createEvaluacionMock({ ...data, ponderacion })
  );
  return normalizeEvaluacion(created);
}

export async function getCalificacionesByEvaluacion(evaluationId) {
  const grades = await withFallback(
    evaluationId,
    () => request(`/evaluaciones/${evaluationId}/calificaciones`),
    () => getCalificacionesMock(evaluationId)
  );
  return toGradeStrings(grades);
}

/** Valida en el cliente con las mismas reglas que el backend (1 a 10, hasta 2 decimales). */
export function validateGrade(rawGrade, modelo) {
  if (modelo === GRADING_MODELS.CUALITATIVO) {
    return GRADING_CATEGORIES.includes(rawGrade) ? null : `La nota debe ser una de: ${GRADING_CATEGORIES.join(", ")}.`;
  }
  const nota = Number(rawGrade);
  const scaled = nota * 100;
  if (!Number.isFinite(nota) || nota < 1 || nota > 10 || Math.abs(scaled - Math.round(scaled)) > 1e-8) {
    return "La nota debe estar entre 1 y 10, con hasta dos decimales.";
  }
  return null;
}

/**
 * Guarda las notas de una evaluación. `grades` es { [alumnoId]: nota }.
 * Los campos vacíos se ignoran (quedan sin calificar).
 * Devuelve { saved, failed } para que la pantalla informe el resultado.
 */
export async function saveCalificaciones(evaluationId, grades, modelo = GRADING_MODELS.CUANTITATIVO) {
  const items = [];
  const failed = [];

  Object.entries(grades || {}).forEach(([studentId, rawGrade]) => {
    if (rawGrade === "" || rawGrade === null || rawGrade === undefined) return;
    const reason = validateGrade(rawGrade, modelo);
    if (reason) {
      failed.push({ studentId: String(studentId), reason });
      return;
    }
    items.push({
      alumnoId: String(studentId),
      nota: modelo === GRADING_MODELS.CUALITATIVO ? rawGrade : Number(rawGrade),
      modelo
    });
  });

  if (items.length === 0) return { saved: [], failed };

  return withFallback(
    evaluationId,
    async () => {
      const saved = await request(`/evaluaciones/${evaluationId}/calificaciones`, {
        method: "PUT",
        body: JSON.stringify({ calificaciones: items })
      });
      return { saved: saved || items, failed };
    },
    async () => {
      const validGrades = Object.fromEntries(items.map((item) => [item.alumnoId, item.nota]));
      const result = await saveCalificacionesMock(evaluationId, validGrades, modelo);
      return { saved: result.saved, failed: [...failed, ...result.failed] };
    }
  );
}

function localConfiguracion(courseId) {
  return {
    modelo: getGradingConfigMock().modelo || GRADING_MODELS.CUANTITATIVO,
    modoRecuperatorio: getRecoveryConfigMock(courseId).modo || RECOVERY_MODES.MAYOR
  };
}

function normalizeConfiguracion(config) {
  return {
    modelo: config?.modelo || GRADING_MODELS.CUANTITATIVO,
    modoRecuperatorio: config?.modo_recuperatorio || config?.modoRecuperatorio || RECOVERY_MODES.MAYOR
  };
}

/** Modelo de calificación y regla de recuperatorio del curso. */
export async function getConfiguracionEvaluacion(courseId) {
  const config = await withFallback(
    courseId,
    () => request(`/evaluaciones/curso/${courseId}/configuracion`),
    () => localConfiguracion(courseId)
  );
  return normalizeConfiguracion(config);
}

/** Actualiza `modelo` y/o `modoRecuperatorio` del curso. */
export async function saveConfiguracionEvaluacion(courseId, changes) {
  const payload = {};
  if (changes.modelo !== undefined) payload.modelo = changes.modelo;
  if (changes.modoRecuperatorio !== undefined) payload.modoRecuperatorio = changes.modoRecuperatorio;

  const config = await withFallback(
    courseId,
    () => request(`/evaluaciones/curso/${courseId}/configuracion`, { method: "PUT", body: JSON.stringify(payload) }),
    () => {
      if (payload.modelo !== undefined) saveGradingConfigMock({ modelo: payload.modelo });
      if (payload.modoRecuperatorio !== undefined) saveRecoveryConfigMock(courseId, { modo: payload.modoRecuperatorio });
      return localConfiguracion(courseId);
    }
  );
  return normalizeConfiguracion(config);
}

/**
 * Carga evaluaciones, notas y configuración de un curso y calcula el promedio
 * de cada alumno. Lo usan el detalle de curso y el perfil del alumno.
 */
export async function getResumenAcademicoCurso(courseId, studentIds = []) {
  const [evaluations, config] = await Promise.all([
    getEvaluacionesByCurso(courseId),
    getConfiguracionEvaluacion(courseId)
  ]);
  const gradeEntries = await Promise.all(
    evaluations.map(async (evaluation) => [
      evaluation.id,
      await getCalificacionesByEvaluacion(evaluation.id).catch(() => ({}))
    ])
  );
  const gradesByEvaluation = Object.fromEntries(gradeEntries);
  const averages = studentIds.map((studentId) => ({
    studentId: String(studentId),
    ...calculateStudentAverage(String(studentId), evaluations, gradesByEvaluation, config.modoRecuperatorio, config.modelo)
  }));
  return { evaluations, gradesByEvaluation, config, averages };
}
