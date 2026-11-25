import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SECCIONES, SECCIONES_INFERIORES, SECCIONES_PRINCIPALES, seccionDe } from "../src/lib/rutas.ts";

describe("rutas: la barra lateral", () => {
  it("«Mis tareas» va justo debajo de Calendario y es una sección propia", () => {
    const ids = SECCIONES_PRINCIPALES.map((s) => s.id);
    assert.equal(ids[ids.indexOf("calendario") + 1], "tareas");
    assert.deepEqual(SECCIONES_INFERIORES.map((s) => s.id), ["configuracion", "atajos"]);
  });

  it("estando en las carpetas se marca «Mis tareas», no Documentos", () => {
    assert.equal(seccionDe("/documentos/carpetas"), "tareas");
    assert.equal(seccionDe("/documentos/carpetas/"), "tareas");
    assert.equal(seccionDe("/documentos"), "documentos");
    assert.equal(seccionDe("/documentos/unir-pdf"), "documentos");
  });

  it("no hay dos secciones con el mismo atajo", () => {
    const atajos = SECCIONES.flatMap((s) => (s.atajo ? [s.atajo] : []));
    assert.equal(new Set(atajos).size, atajos.length);
  });
});
