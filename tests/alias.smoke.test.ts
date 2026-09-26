import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claveFecha, fechaLarga } from "../src/lib/calendario/fechas.ts";
import { traducir } from "../src/lib/i18n/index.ts";

describe("ganchos de las pruebas", () => {
  it("cargan módulos que usan el alias «@/» y JSON", () => {
    assert.equal(claveFecha(new Date(2026, 8, 26)), "2026-09-26");
    assert.equal(fechaLarga(new Date(2026, 8, 26)), "sábado 26 de septiembre");
    assert.equal(traducir("Guardar"), "Guardar", "sin traducción, el español es la clave");
  });
});
