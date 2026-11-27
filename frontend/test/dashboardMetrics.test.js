import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCourseAcademicAverage,
  countUnsubmittedTasksByStudent,
  detectCourseAlerts,
  ALERT_SEVERITY
} from "../src/modules/cursos/services/dashboardMetrics.js";

test("HU-31 #337: calculateCourseAcademicAverage calcula el promedio general del curso", () => {
  assert.equal(calculateCourseAcademicAverage([]), null);
  assert.equal(calculateCourseAcademicAverage([{ average: null }]), null);
  assert.equal(calculateCourseAcademicAverage([{ average: 8 }, { average: 6 }]), 7);
  assert.equal(
    calculateCourseAcademicAverage([{ average: 7.5 }, { average: 9 }, { average: null }]),
    8.25
  );
  // Soporta números directos
  assert.equal(calculateCourseAcademicAverage([7, 8, 9]), 8);
});

test("HU-31 #337: countUnsubmittedTasksByStudent agrupa cantidades adeudadas por alumno", () => {
  const adeudados = [
    { alumnoId: "a1", tareaId: "t1" },
    { alumnoId: "a1", tareaId: "t2" },
    { alumnoId: "a2", tareaId: "t1" }
  ];

  const counts = countUnsubmittedTasksByStudent(adeudados);
  assert.equal(counts["a1"], 2);
  assert.equal(counts["a2"], 1);
  assert.equal(counts["a3"], undefined);
});

test("HU-31 #337: detectCourseAlerts detecta alertas de asistencia, notas y tareas con severidad", () => {
  const students = [
    { id: "s1", nombre: "Carlos", apellido: "Rios" },
    { id: "s2", nombre: "Lucia", apellido: "Mendez" },
    { id: "s3", nombre: "Marcos", apellido: "Paz" }
  ];

  const attendancePercentages = [
    { alumno: { id: "s1" }, porcentaje: 55 }, // < 60% -> CRITICO Asistencia
    { alumno: { id: "s2" }, porcentaje: 70 }, // < 75% -> ALTO Asistencia
    { alumno: { id: "s3" }, porcentaje: 95 }  // OK
  ];

  const studentAverages = [
    { studentId: "s1", average: 8 },  // OK
    { studentId: "s2", average: 3.5 }, // < 4.0 -> CRITICO Calificación
    { studentId: "s3", average: 5.5 }  // < 6.0 -> MEDIO Calificación
  ];

  const trabajosNoEntregados = [
    { alumnoId: "s1", tareaId: "t1" },
    { alumnoId: "s1", tareaId: "t2" },
    { alumnoId: "s1", tareaId: "t3" }, // 3 tareas -> ALTO Tarea
    { alumnoId: "s3", tareaId: "t1" }  // 1 tarea -> MEDIO Tarea
  ];

  const alerts = detectCourseAlerts({
    students,
    attendancePercentages,
    studentAverages,
    trabajosNoEntregados,
    attendanceThreshold: 75,
    gradeThreshold: 6
  });

  assert.ok(alerts.length >= 5);

  // Las más críticas deben figurar primero
  assert.equal(alerts[0].severidad, ALERT_SEVERITY.CRITICO);
  assert.equal(alerts[1].severidad, ALERT_SEVERITY.CRITICO);

  // Comprobar presencia de alerta de tareas (#329)
  const taskAlert = alerts.find((a) => a.tipo === "TAREA" && a.alumnoId === "s1");
  assert.ok(taskAlert);
  assert.equal(taskAlert.severidad, ALERT_SEVERITY.ALTO);

  // Si no hay problemas, retorna array vacío
  const emptyAlerts = detectCourseAlerts({
    students: [{ id: "s-ok", nombre: "Todo Bien" }],
    attendancePercentages: [{ alumno: { id: "s-ok" }, porcentaje: 100 }],
    studentAverages: [{ studentId: "s-ok", average: 10 }],
    trabajosNoEntregados: []
  });
  assert.equal(emptyAlerts.length, 0);
});
