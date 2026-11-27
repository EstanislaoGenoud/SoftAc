import test from "node:test";
import assert from "node:assert/strict";

// Polyfill de localStorage
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

import { enrollStudent } from "../src/modules/alumnos/services/studentService.js";

test("HU-06 / Formulario de inscripción: enrollStudent envía payload correctamente estructurado", async () => {
  let capturedUrl = "";
  let capturedBody = null;

  // Interceptamos fetch para verificar el contrato del endpoint
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        alumno: {
          id: "uuid-alumno-creado",
          nombre: capturedBody.nombre,
          apellido: capturedBody.apellido,
          identificacion: capturedBody.identificacion
        },
        inscripcion: {
          id: "uuid-inscripcion",
          alumno_id: "uuid-alumno-creado",
          curso_materia_id: capturedBody.cursoMateriaId,
          estado: "REGULAR"
        }
      })
    };
  };

  try {
    const res = await enrollStudent({
      nombre: "Martina",
      apellido: "López",
      identificacion: "44123987",
      cursoId: "curso-materia-test-1"
    });

    assert.equal(capturedUrl, "http://localhost:3000/alumnos/inscribir");
    assert.equal(capturedBody.nombre, "Martina");
    assert.equal(capturedBody.apellido, "López");
    assert.equal(capturedBody.identificacion, "44123987");
    assert.equal(capturedBody.cursoMateriaId, "curso-materia-test-1");

    assert.ok(res.alumno);
    assert.equal(res.alumno.nombre, "Martina");
    assert.equal(res.inscripcion.estado, "REGULAR");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HU-06 / Formulario de inscripción: enrollStudent maneja errores de servidor", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ message: "El alumno ya se encuentra inscripto en este curso" })
  });

  try {
    await assert.rejects(
      async () => {
        await enrollStudent({
          nombre: "Lucas",
          apellido: "Díaz",
          cursoId: "curso-1"
        });
      },
      {
        name: "Error",
        message: "El alumno ya se encuentra inscripto en este curso"
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
