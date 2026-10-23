import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTENDANCE_STATES,
  attendanceValue,
  calculateAttendancePercentage,
  isStudentAtRisk,
  summarizeAttendance
} from "../src/modules/asistencias/services/attendanceService.js";

const record = (estado) => ({ estado });

test("porcentaje sin clases devuelve null", () => {
  assert.equal(calculateAttendancePercentage([]), null);
});

test("todas las asistencias presentes equivalen a 100%", () => {
  assert.equal(calculateAttendancePercentage([
    record(ATTENDANCE_STATES.PRESENTE),
    record(ATTENDANCE_STATES.PRESENTE)
  ]), 100);
});

test("todas las asistencias ausentes equivalen a 0%", () => {
  assert.equal(calculateAttendancePercentage([
    record(ATTENDANCE_STATES.AUSENTE),
    record(ATTENDANCE_STATES.AUSENTE)
  ]), 0);
});

test("media falta vale medio presente en el porcentaje", () => {
  assert.equal(attendanceValue(ATTENDANCE_STATES.MEDIA_FALTA), 0.5);
  assert.equal(calculateAttendancePercentage([
    record(ATTENDANCE_STATES.PRESENTE),
    record(ATTENDANCE_STATES.AUSENTE),
    record(ATTENDANCE_STATES.MEDIA_FALTA)
  ]), 50);
});

test("el alumno queda en riesgo si está por debajo del límite", () => {
  const records = [
    record(ATTENDANCE_STATES.PRESENTE),
    record(ATTENDANCE_STATES.AUSENTE)
  ];

  assert.equal(isStudentAtRisk(records, 75), true);
  assert.equal(isStudentAtRisk(records, 50), false);
});

test("el resumen cuenta todos los estados", () => {
  const summary = summarizeAttendance([
    record(ATTENDANCE_STATES.PRESENTE),
    record(ATTENDANCE_STATES.AUSENTE),
    record(ATTENDANCE_STATES.MEDIA_FALTA)
  ]);

  assert.deepEqual(summary, {
    [ATTENDANCE_STATES.PRESENTE]: 1,
    [ATTENDANCE_STATES.AUSENTE]: 1,
    [ATTENDANCE_STATES.MEDIA_FALTA]: 1,
    total: 3,
    porcentaje: 50
  });
});
