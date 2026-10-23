import test from "node:test";
import assert from "node:assert/strict";
import {
  RECOVERY_MODES,
  calculateStudentAverage,
  numericToQualitative,
  qualitativeToNumeric
} from "../src/modules/evaluaciones/services/evaluacionMockService.js";

const evaluation = (id, ponderacion, extra = {}) => ({
  id,
  nombre: id,
  tipo: "Examen",
  ponderacion,
  ...extra
});

test("sin evaluaciones válidas no calcula promedio", () => {
  const result = calculateStudentAverage("student-1", [], {}, RECOVERY_MODES.MAYOR, "cuantitativo");

  assert.deepEqual(result, { average: null, validWeight: 0 });
});

test("calcula promedio con una evaluación", () => {
  const evaluations = [evaluation("evaluation-1", 100)];
  const grades = { "evaluation-1": { "student-1": "8" } };

  assert.deepEqual(
    calculateStudentAverage("student-1", evaluations, grades, RECOVERY_MODES.MAYOR, "cuantitativo"),
    { average: 8, validWeight: 100 }
  );
});

test("calcula promedio ponderado con notas mixtas", () => {
  const evaluations = [
    evaluation("evaluation-1", 40),
    evaluation("evaluation-2", 60)
  ];
  const grades = {
    "evaluation-1": { "student-1": "6" },
    "evaluation-2": { "student-1": "9" }
  };

  assert.equal(
    calculateStudentAverage("student-1", evaluations, grades, RECOVERY_MODES.MAYOR, "cuantitativo").average,
    7.8
  );
});

test("un recuperatorio toma la nota mayor cuando corresponde", () => {
  const evaluations = [
    evaluation("original", 100),
    evaluation("recovery", 0, { tipo: "Recuperatorio", evaluacionOriginalId: "original" })
  ];
  const grades = {
    original: { "student-1": "5" },
    recovery: { "student-1": "8" }
  };

  assert.equal(
    calculateStudentAverage("student-1", evaluations, grades, RECOVERY_MODES.MAYOR, "cuantitativo").average,
    8
  );
});

test("un recuperatorio puede promediarse con la nota original", () => {
  const evaluations = [
    evaluation("original", 100),
    evaluation("recovery", 0, { tipo: "Recuperatorio", evaluacionOriginalId: "original" })
  ];
  const grades = {
    original: { "student-1": "5" },
    recovery: { "student-1": "8" }
  };

  assert.equal(
    calculateStudentAverage("student-1", evaluations, grades, RECOVERY_MODES.PROMEDIO, "cuantitativo").average,
    6.5
  );
});

test("si falta la nota original usa la del recuperatorio", () => {
  const evaluations = [
    evaluation("original", 100),
    evaluation("recovery", 0, { tipo: "Recuperatorio", evaluacionOriginalId: "original" })
  ];
  const grades = { recovery: { "student-1": "7" } };

  assert.equal(
    calculateStudentAverage("student-1", evaluations, grades, RECOVERY_MODES.MAYOR, "cuantitativo").average,
    7
  );
});

test("convierte categorías cualitativas a valores numéricos y viceversa", () => {
  assert.equal(qualitativeToNumeric("Muy bueno"), 10);
  assert.equal(qualitativeToNumeric("Insuficiente"), 3);
  assert.equal(numericToQualitative(10), "Muy bueno");
  assert.equal(numericToQualitative(8), "Bueno");
  assert.equal(numericToQualitative(5), "Regular");
  assert.equal(numericToQualitative(2), "Insuficiente");
});
