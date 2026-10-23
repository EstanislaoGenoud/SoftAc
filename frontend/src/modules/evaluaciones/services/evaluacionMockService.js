const STORAGE_KEY = "softac_mock_evaluaciones";
const GRADES_STORAGE_KEY = "softac_mock_calificaciones";
const GRADING_CONFIG_KEY = "softac_mock_grading_config";

export const MOCK_EVALUATION_TYPES = [
  "Examen",
  "Trabajo práctico",
  "Oral",
  "Recuperatorio"
];

export const MOCK_GRADING_CATEGORIES = [
  "Muy bueno",
  "Bueno",
  "Regular",
  "Insuficiente"
];

export const QUALITATIVE_VALUES = {
  "Muy bueno": 10,
  Bueno: 8,
  Regular: 6,
  Insuficiente: 3
};

export const RECOVERY_MODES = {
  MAYOR: "mayor",
  PROMEDIO: "promedio"
};

function readEvaluations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeEvaluations(evaluations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evaluations));
}

function readGrades() {
  try {
    return JSON.parse(localStorage.getItem(GRADES_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function getEvaluacionesByCurso(courseId) {
  return readEvaluations().filter((evaluation) => String(evaluation.courseId) === String(courseId));
}

export async function createEvaluacionMock(data) {
  const ponderacion = Number(data.ponderacion);
  if (!Number.isFinite(ponderacion) || ponderacion < 0 || ponderacion > 100) {
    throw new Error("La ponderación debe estar entre 0% y 100%.");
  }

  if (!MOCK_EVALUATION_TYPES.includes(data.tipo)) {
    throw new Error("Seleccioná un tipo de evaluación válido.");
  }

  const evaluations = readEvaluations();
  const duplicate = evaluations.some((evaluation) =>
    String(evaluation.courseId) === String(data.courseId) &&
    evaluation.nombre.trim().toLowerCase() === data.nombre.trim().toLowerCase() &&
    evaluation.fecha === data.fecha
  );

  if (duplicate) {
    throw new Error("Ya existe una evaluación con ese nombre y fecha.");
  }

  const evaluation = {
    id: `mock-evaluacion-${Date.now()}`,
    courseId: String(data.courseId),
    nombre: data.nombre.trim(),
    tipo: data.tipo,
    evaluacionOriginalId: data.evaluacionOriginalId || null,
    ponderacion: Math.round(ponderacion * 100) / 100,
    fecha: data.fecha,
    descripcion: data.descripcion?.trim() || "",
    createdAt: new Date().toISOString(),
    _isMock: true
  };

  writeEvaluations([evaluation, ...evaluations]);
  return evaluation;
}

export async function getCalificacionesByEvaluacion(evaluationId) {
  return readGrades()
    .filter((grade) => String(grade.evaluationId) === String(evaluationId))
    .reduce((result, grade) => {
      result[grade.studentId] = String(grade.nota);
      return result;
    }, {});
}

export function getGradingConfigMock() {
  try {
    return JSON.parse(localStorage.getItem(GRADING_CONFIG_KEY)) || { modelo: "cuantitativo" };
  } catch {
    return { modelo: "cuantitativo" };
  }
}

export function saveGradingConfigMock(config) {
  localStorage.setItem(GRADING_CONFIG_KEY, JSON.stringify(config));
  return config;
}

export function qualitativeToNumeric(category) {
  return QUALITATIVE_VALUES[category] ?? null;
}

export function numericToQualitative(value) {
  if (value === null || value === undefined) return null;
  if (value >= 9) return "Muy bueno";
  if (value >= 7) return "Bueno";
  if (value >= 4) return "Regular";
  return "Insuficiente";
}

export function getRecoveryConfigMock(courseId) {
  try {
    return JSON.parse(localStorage.getItem(`softac_mock_recovery_${courseId}`)) || { modo: RECOVERY_MODES.MAYOR };
  } catch {
    return { modo: RECOVERY_MODES.MAYOR };
  }
}

export function saveRecoveryConfigMock(courseId, config) {
  localStorage.setItem(`softac_mock_recovery_${courseId}`, JSON.stringify(config));
  return config;
}

function gradeToNumeric(value, modelo) {
  if (value === "" || value === null || value === undefined) return null;
  return modelo === "cualitativo" ? qualitativeToNumeric(value) : Number(value);
}

export function calculateStudentAverage(studentId, evaluations, gradesByEvaluation, recoveryMode, modelo) {
  const originals = evaluations.filter((evaluation) => evaluation.tipo !== "Recuperatorio");
  let weightedTotal = 0;
  let validWeight = 0;

  originals.forEach((original) => {
    const originalGrade = gradeToNumeric(gradesByEvaluation[original.id]?.[studentId], modelo);
    const recoveries = evaluations.filter((evaluation) => evaluation.evaluacionOriginalId === original.id);
    const recoveryGrades = recoveries
      .map((recovery) => gradeToNumeric(gradesByEvaluation[recovery.id]?.[studentId], modelo))
      .filter((grade) => grade !== null && Number.isFinite(grade));

    let effectiveGrade = originalGrade;
    if (recoveryGrades.length > 0 && originalGrade === null) {
      effectiveGrade = recoveryGrades[0];
    } else if (recoveryGrades.length > 0 && originalGrade !== null) {
      effectiveGrade = recoveryMode === RECOVERY_MODES.PROMEDIO
        ? (originalGrade + recoveryGrades[0]) / 2
        : Math.max(originalGrade, recoveryGrades[0]);
    }

    const weight = Number(original.ponderacion || 0);
    if (effectiveGrade !== null && Number.isFinite(effectiveGrade) && weight > 0) {
      weightedTotal += effectiveGrade * weight;
      validWeight += weight;
    }
  });

  if (validWeight === 0) return { average: null, validWeight: 0 };
  return {
    average: Math.round((weightedTotal / validWeight) * 100) / 100,
    validWeight
  };
}

export async function saveCalificacionesMock(evaluationId, grades, modelo = "cuantitativo") {
  const storedGrades = readGrades();
  const saved = [];
  const failed = [];

  Object.entries(grades).forEach(([studentId, rawGrade]) => {
    if (rawGrade === "" || rawGrade === null || rawGrade === undefined) return;
    const nota = Number(rawGrade);
    const validQualitative = modelo === "cualitativo" && MOCK_GRADING_CATEGORIES.includes(rawGrade);
    const validQuantitative = modelo === "cuantitativo" && Number.isFinite(nota) && nota >= 1 && nota <= 10;
    if (!validQualitative && !validQuantitative) {
      failed.push({ studentId, reason: "La nota debe estar entre 1 y 10." });
      return;
    }

    const record = {
      id: `mock-calificacion-${evaluationId}-${studentId}`,
      evaluationId: String(evaluationId),
      studentId: String(studentId),
      modelo,
      nota: modelo === "cualitativo" ? rawGrade : Math.round(nota * 100) / 100,
      updatedAt: new Date().toISOString(),
      _isMock: true
    };
    const index = storedGrades.findIndex((item) => item.id === record.id);
    if (index >= 0) storedGrades[index] = record;
    else storedGrades.push(record);
    saved.push(record);
  });

  localStorage.setItem(GRADES_STORAGE_KEY, JSON.stringify(storedGrades));
  return { saved, failed };
}
