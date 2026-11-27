import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { SECCIONES, SECCIONES_INFERIORES, SECCIONES_PRINCIPALES, seccionDe, esRutaDeAjustes, rutaValida } from "../src/lib/rutas.ts";

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

describe("rutas de Configuración", () => {
  it("reconoce Configuración con o sin categoría, y nada más", () => {
    for (const r of ["/configuracion", "/configuracion/", "/configuracion?categoria=avisos&ajuste=sonido"]) assert.ok(esRutaDeAjustes(r), r);
    for (const r of ["/inicio", "/repaso?mazo=1", "/configuracion-vieja", "/documentos/carpetas"]) assert.ok(!esRutaDeAjustes(r), r);
  });
});

describe("rutas: se puede regresar a cualquier pantalla", () => {
  it("cada pantalla de la aplicación se reconoce como válida (si no, «Inicio» de Configuración no sabría volver a ella)", () => {
    const paginas = readdirSync("src/app", { recursive: true, encoding: "utf8" })
      .map((f) => f.replaceAll("\\", "/"))
      .filter((f) => f.endsWith("/page.tsx") && !f.includes("[") && !f.startsWith("api/"))
      .map((f) => `/${f.slice(0, -"/page.tsx".length)}`);
    assert.ok(paginas.length > 10);
    for (const ruta of paginas) assert.ok(rutaValida(ruta), ruta);
  });
});
