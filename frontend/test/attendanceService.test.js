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
  ATTENDANCE_STATES,
  attendanceValue,
  calculateAttendancePercentage,
  isStudentAtRisk,
  summarizeAttendance,
  getStudentRecords,
  saveAttendance,
  getAttendance
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

// HU-13: Probar múltiples clases
test("HU-13: getStudentRecords recupera el historial de un alumno a través de múltiples clases", () => {
  const attendanceByClass = {
    "clase-1": {
      "alumno-1": { alumnoId: "alumno-1", estado: ATTENDANCE_STATES.PRESENTE, fecha: "2026-03-01" },
      "alumno-2": { alumnoId: "alumno-2", estado: ATTENDANCE_STATES.AUSENTE, fecha: "2026-03-01" }
    },
    "clase-2": {
      "alumno-1": { alumnoId: "alumno-1", estado: ATTENDANCE_STATES.MEDIA_FALTA, fecha: "2026-03-08" },
      "alumno-2": { alumnoId: "alumno-2", estado: ATTENDANCE_STATES.PRESENTE, fecha: "2026-03-08" }
    },
    "clase-3": {
      "alumno-1": { alumnoId: "alumno-1", estado: ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO, fecha: "2026-03-15" }
    }
  };

  const recordsAlumno1 = getStudentRecords("alumno-1", attendanceByClass);
  assert.equal(recordsAlumno1.length, 3);
  assert.equal(recordsAlumno1[0].estado, ATTENDANCE_STATES.PRESENTE);
  assert.equal(recordsAlumno1[1].estado, ATTENDANCE_STATES.MEDIA_FALTA);
  assert.equal(recordsAlumno1[2].estado, ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO);

  const percentage = calculateAttendancePercentage(recordsAlumno1);
  // (1 + 0.5 + 1) / 3 = 2.5 / 3 = 83.33% -> 83%
  assert.equal(percentage, 83);
});

// HU-14: Modificar asistencia
test("HU-14: saveAttendance permite modificar el estado de asistencia de un alumno y persiste el cambio", async () => {
  globalThis.localStorage.clear();

  const claseId = "clase-modificar-test";
  const registrosIniciales = {
    "alumno-10": { alumnoId: "alumno-10", estado: ATTENDANCE_STATES.AUSENTE, observacion: "" }
  };

  // Guardado inicial como AUSENTE
  await saveAttendance(claseId, registrosIniciales);
  let guardado = await getAttendance(claseId);
  assert.equal(guardado["alumno-10"].estado, ATTENDANCE_STATES.AUSENTE);

  // Modificación a JUSTIFICADA (AUSENTE_CON_CERTIFICADO) con observación
  const registrosModificados = {
    "alumno-10": {
      alumnoId: "alumno-10",
      estado: ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO,
      observacion: "Presentó certificado médico en secretaría"
    }
  };

  await saveAttendance(claseId, registrosModificados);
  guardado = await getAttendance(claseId);

  assert.equal(guardado["alumno-10"].estado, ATTENDANCE_STATES.AUSENTE_CON_CERTIFICADO);
  assert.equal(guardado["alumno-10"].observacion, "Presentó certificado médico en secretaría");
});
