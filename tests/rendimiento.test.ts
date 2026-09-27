import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ahorroActivo, efectoEfectivo, equipoModesto, movimientoEfectivo, normalizarModoAhorro, planDeIndexado } from "../src/lib/rendimiento.ts";

describe("equipoModesto", () => {
  it("pocos núcleos o poca memoria", () => {
    assert.equal(equipoModesto({ nucleos: 2, memoriaGB: 8 }), true);
    assert.equal(equipoModesto({ nucleos: 4, memoriaGB: 8 }), true);
    assert.equal(equipoModesto({ nucleos: 12, memoriaGB: 4 }), true);
    assert.equal(equipoModesto({ nucleos: 12, memoriaGB: 2 }), true);
  });
  it("un equipo holgado no lo es", () => {
    assert.equal(equipoModesto({ nucleos: 8, memoriaGB: 8 }), false);
    assert.equal(equipoModesto({ nucleos: 6, memoriaGB: 8 }), false);
  });
  it("sin datos, o datos raros, se supone que no (no recortar de más)", () => {
    assert.equal(equipoModesto({}), false);
    assert.equal(equipoModesto({ nucleos: 0, memoriaGB: 0 }), false);
    assert.equal(equipoModesto({ nucleos: Number.NaN, memoriaGB: -1 }), false);
    assert.equal(equipoModesto({ nucleos: 8 }), false);
  });
});

describe("ahorroActivo", () => {
  const modesto = { nucleos: 2, memoriaGB: 4 };
  const rapido = { nucleos: 16, memoriaGB: 8 };
  it("«auto» lo decide el equipo", () => {
    assert.equal(ahorroActivo("auto", modesto), true);
    assert.equal(ahorroActivo("auto", rapido), false);
  });
  it("«si» y «no» mandan sobre el equipo", () => {
    assert.equal(ahorroActivo("si", rapido), true);
    assert.equal(ahorroActivo("no", modesto), false);
  });
});

describe("normalizarModoAhorro", () => {
  it("solo «si» y «no» valen; lo demás es «auto»", () => {
    assert.equal(normalizarModoAhorro("si"), "si");
    assert.equal(normalizarModoAhorro("no"), "no");
    for (const x of ["auto", "", 1, null, undefined, "SI"]) assert.equal(normalizarModoAhorro(x), "auto");
  });
});

describe("planDeIndexado", () => {
  it("en bajo consumo espera más y respira entre archivos", () => {
    const normal = planDeIndexado(false);
    const ahorro = planDeIndexado(true);
    assert.ok(ahorro.esperaInicialMs > normal.esperaInicialMs);
    assert.ok(ahorro.pausaEntreArchivosMs > normal.pausaEntreArchivosMs);
    assert.equal(normal.pausaEntreArchivosMs, 0);
  });
});

describe("lo que se aplica de verdad", () => {
  it("el efecto de ventana se apaga en bajo consumo", () => {
    assert.equal(efectoEfectivo("mica", true, "ninguno"), "ninguno");
    assert.equal(efectoEfectivo("mica", false, "ninguno"), "mica");
  });
  it("el movimiento baja en bajo consumo solo si no se pidió otra cosa", () => {
    assert.equal(movimientoEfectivo("sistema", true), "si");
    assert.equal(movimientoEfectivo("no", true), "no", "quien pidió todas las animaciones las conserva");
    assert.equal(movimientoEfectivo("sistema", false), "sistema");
    assert.equal(movimientoEfectivo("si", false), "si");
  });
});
