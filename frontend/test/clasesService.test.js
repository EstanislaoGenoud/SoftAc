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
  createClase,
  getClasesByCursoMateria,
  getUltimaClase,
  saveObservacionClase
} from "../src/modules/asistencias/services/clasesService.js";

test("HU-17: createClase registra una clase con fecha, tema y observaciones", async () => {
  globalThis.localStorage.clear();

  const nuevaClase = await createClase({
    cursoMateriaId: "curso-test-1",
    fecha: "2026-05-10",
    tema: "Ecuaciones Diferenciales",
    observaciones: "Alumnos participaron con entusiasmo",
    estado: "DICTADA"
  });

  assert.ok(nuevaClase);
  assert.equal(nuevaClase.fecha, "2026-05-10");
  assert.equal(nuevaClase.tema, "Ecuaciones Diferenciales");
  assert.equal(nuevaClase.observaciones, "Alumnos participaron con entusiasmo");
  assert.equal(nuevaClase.estado, "DICTADA");
});

test("HU-17: createClase asigna estado DICTADA por defecto", async () => {
  globalThis.localStorage.clear();

  const clase = await createClase({
    cursoMateriaId: "curso-test-1",
    fecha: "2026-05-12",
    tema: "Lógica proposicional"
  });

  assert.equal(clase.estado, "DICTADA");
});

test("HU-18: getUltimaClase devuelve null si el curso no tiene clases", async () => {
  globalThis.localStorage.clear();

  const ultima = await getUltimaClase("curso-sin-clases");
  assert.equal(ultima, null);
});

test("HU-18: getUltimaClase ordena cronológicamente y retorna la más reciente", async () => {
  globalThis.localStorage.clear();

  // Registramos 3 clases con fechas distintas
  await createClase({
    cursoMateriaId: "curso-orden-test",
    fecha: "2026-03-01",
    tema: "Clase 1 - Introducción"
  });

  await createClase({
    cursoMateriaId: "curso-orden-test",
    fecha: "2026-04-15",
    tema: "Clase 3 - La más reciente"
  });

  await createClase({
    cursoMateriaId: "curso-orden-test",
    fecha: "2026-03-20",
    tema: "Clase 2 - Intermedia"
  });

  const ultima = await getUltimaClase("curso-orden-test");
  assert.ok(ultima);
  assert.equal(ultima.fecha, "2026-04-15");
  assert.equal(ultima.tema, "Clase 3 - La más reciente");
});

test("HU-18: getClasesByCursoMateria lista clases en orden cronológico descendente", async () => {
  globalThis.localStorage.clear();

  await createClase({
    cursoMateriaId: "curso-desc-test",
    fecha: "2026-02-10",
    tema: "Tema A"
  });

  await createClase({
    cursoMateriaId: "curso-desc-test",
    fecha: "2026-06-25",
    tema: "Tema B"
  });

  const clases = await getClasesByCursoMateria("curso-desc-test");
  assert.equal(clases.length, 2);
  assert.equal(clases[0].fecha, "2026-06-25");
  assert.equal(clases[1].fecha, "2026-02-10");
});

test("HU-19: saveObservacionClase registra y actualiza observaciones pedagógicas", async () => {
  globalThis.localStorage.clear();

  const clase = await createClase({
    cursoMateriaId: "curso-obs-test",
    fecha: "2026-05-18",
    tema: "Historia Argentina",
    observaciones: "Observación inicial"
  });

  const res = await saveObservacionClase(clase.id, "Observación modificada por el docente");
  assert.equal(res.observaciones, "Observación modificada por el docente");

  const clasesActualizadas = await getClasesByCursoMateria("curso-obs-test");
  assert.equal(clasesActualizadas[0].observaciones, "Observación modificada por el docente");
});
