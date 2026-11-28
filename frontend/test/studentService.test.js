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
          curso_materia_id: "uuid-curso-materia",
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
    // El backend resuelve la materia a partir del curso: no se adivina en el frontend.
    assert.equal(capturedBody.cursoId, "curso-materia-test-1");
    assert.equal(capturedBody.cursoMateriaId, undefined);

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

test("HU-06 / Inscripción: si se indica la materia del curso, se envía cursoMateriaId", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = null;
  globalThis.fetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ alumno: { id: "a1" }, inscripcion: {}, alumno_existente: true }) };
  };

  try {
    const res = await enrollStudent({ nombre: "Ana", apellido: "Paz", cursoId: "c1", cursoMateriaId: "cm1" });
    assert.equal(capturedBody.cursoMateriaId, "cm1");
    assert.equal(capturedBody.cursoId, undefined);
    assert.equal(res.alumno_existente, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HU-06 / Inscripción: une los mensajes de validación del backend", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ message: ["El curso no existe o no tiene una materia asociada."] })
  });

  try {
    await assert.rejects(
      enrollStudent({ nombre: "Ana", apellido: "Paz", cursoId: "c1" }),
      /no tiene una materia asociada/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
