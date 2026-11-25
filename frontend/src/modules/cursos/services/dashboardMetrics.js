/**
 * Métricas y reglas de alertas para el Dashboard del Curso (#337 HU-31 y #329 HU-30)
 */

export const ALERT_SEVERITY = {
  CRITICO: "CRITICO",
  ALTO: "ALTO",
  MEDIO: "MEDIO"
};

/**
 * Calcula el promedio académico general del curso a partir de los promedios de los alumnos
 */
export function calculateCourseAcademicAverage(studentAverages = []) {
  const valid = studentAverages
    .map((item) => (typeof item === "number" ? item : item?.average))
    .filter((avg) => typeof avg === "number" && !isNaN(avg) && avg !== null);

  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / valid.length) * 100) / 100;
}

/**
 * Agrupa los trabajos no entregados por alumno para generar alertas
 */
export function countUnsubmittedTasksByStudent(trabajosNoEntregados = []) {
  const counts = {};
  for (const item of trabajosNoEntregados) {
    const sid = String(item.alumnoId);
    counts[sid] = (counts[sid] || 0) + 1;
  }
  return counts;
}

/**
 * Detecta y jerarquiza todas las alertas académicas del curso
 * @param {Object} params
 * @param {Array} params.students - Lista de alumnos
 * @param {Array} params.attendancePercentages - Lista de { alumno: { id }, porcentaje }
 * @param {Array} params.studentAverages - Lista de { studentId, average }
 * @param {Array} params.trabajosNoEntregados - Lista de trabajos adeudados
 * @param {number} [params.attendanceThreshold=75]
 * @param {number} [params.gradeThreshold=6]
 */
export function detectCourseAlerts({
  students = [],
  attendancePercentages = [],
  studentAverages = [],
  trabajosNoEntregados = [],
  attendanceThreshold = 75,
  gradeThreshold = 6
}) {
  const alerts = [];

  // Mapear porcentajes de asistencia por ID
  const attendanceMap = {};
  for (const item of attendancePercentages) {
    const sid = String(item?.alumno?.id ?? item?.alumnoId ?? item?.id);
    if (sid && item.porcentaje !== undefined && item.porcentaje !== null) {
      attendanceMap[sid] = item.porcentaje;
    }
  }

  // Mapear promedios por ID
  const gradeMap = {};
  for (const item of studentAverages) {
    const sid = String(item?.studentId ?? item?.id);
    if (sid && item.average !== undefined && item.average !== null) {
      gradeMap[sid] = item.average;
    }
  }

  // Conteo de trabajos adeudados por alumno
  const unsubmittedCountMap = countUnsubmittedTasksByStudent(trabajosNoEntregados);

  for (const student of students) {
    const sid = String(student.id ?? student.alumnoId);
    const studentName =
      [student.nombre, student.apellido].filter(Boolean).join(" ") ||
      student.name ||
      "Alumno";

    // 1. Alerta de Inasistencia
    const attendance = attendanceMap[sid];
    if (attendance !== undefined && attendance < attendanceThreshold) {
      const isCritical = attendance < 60;
      alerts.push({
        id: `alert-att-${sid}`,
        alumnoId: sid,
        alumnoNombre: studentName,
        tipo: "ASISTENCIA",
        titulo: `${studentName}: Asistencia baja (${attendance}%)`,
        descripcion: `Porcentaje por debajo del umbral mínimo del ${attendanceThreshold}%.`,
        severidad: isCritical ? ALERT_SEVERITY.CRITICO : ALERT_SEVERITY.ALTO,
        valor: `${attendance}%`
      });
    }

    // 2. Alerta de Promedio Académico
    const avg = gradeMap[sid];
    if (avg !== undefined && avg < gradeThreshold) {
      const isCritical = avg < 4;
      alerts.push({
        id: `alert-grade-${sid}`,
        alumnoId: sid,
        alumnoNombre: studentName,
        tipo: "CALIFICACION",
        titulo: `${studentName}: Promedio en riesgo (${avg})`,
        descripcion: `Calificación por debajo de la nota mínima requerida (${gradeThreshold}).`,
        severidad: isCritical ? ALERT_SEVERITY.CRITICO : ALERT_SEVERITY.MEDIO,
        valor: `${avg}`
      });
    }

    // 3. Alerta de Trabajos No Entregados (#329)
    const pendingCount = unsubmittedCountMap[sid] || 0;
    if (pendingCount >= 1) {
      const isCritical = pendingCount >= 3;
      alerts.push({
        id: `alert-task-${sid}`,
        alumnoId: sid,
        alumnoNombre: studentName,
        tipo: "TAREA",
        titulo: `${studentName}: ${pendingCount} ${pendingCount === 1 ? "tarea vencida" : "tareas vencidas"} sin entregar`,
        descripcion: `Adeuda entregas con fecha límite superada.`,
        severidad: isCritical ? ALERT_SEVERITY.ALTO : ALERT_SEVERITY.MEDIO,
        valor: `${pendingCount} adeudadas`
      });
    }
  }

  // Ordenar alertas: CRITICO primero, luego ALTO, luego MEDIO
  const priority = {
    [ALERT_SEVERITY.CRITICO]: 1,
    [ALERT_SEVERITY.ALTO]: 2,
    [ALERT_SEVERITY.MEDIO]: 3
  };

  return alerts.sort((a, b) => (priority[a.severidad] || 99) - (priority[b.severidad] || 99));
}
