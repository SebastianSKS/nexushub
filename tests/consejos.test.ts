import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSEJOS_IDS, ESPERA_ENTRE_CONSEJOS_MS, esConsejoId, normalizarVistos, puedeMostrarse, type EntornoDeConsejo } from "../src/lib/consejos.ts";

const base: EntornoDeConsejo = { vistos: [], algoAbierto: false, ultimoEn: 0, ahora: 1_000_000 };

describe("normalizarVistos", () => {
  it("deja solo consejos que existen, sin repetir", () => {
    assert.deepEqual(normalizarVistos(["primera-clase", "primera-clase", "inventado", 3, null, "primer-resultado"]), ["primera-clase", "primer-resultado"]);
  });
  it("con basura, nada visto", () => {
    for (const malo of [null, undefined, "primera-clase", 5, {}]) assert.deepEqual(normalizarVistos(malo), []);
  });
  it("reconoce cada id", () => {
    for (const id of CONSEJOS_IDS) assert.ok(esConsejoId(id));
    assert.equal(esConsejoId("otro"), false);
  });
});

describe("puedeMostrarse", () => {
  it("sale la primera vez, cuando todo está tranquilo", () => {
    assert.equal(puedeMostrarse("primera-clase", base), true);
  });
  it("nunca dos veces el mismo", () => {
    assert.equal(puedeMostrarse("primera-clase", { ...base, vistos: ["primera-clase"] }), false);
    assert.equal(puedeMostrarse("primer-resultado", { ...base, vistos: ["primera-clase"] }), true);
  });
  it("espera si hay una guía o las novedades abiertas", () => {
    assert.equal(puedeMostrarse("primera-clase", { ...base, algoAbierto: true }), false);
  });
  it("no se apila con el consejo anterior: hay que esperar un rato", () => {
    const ahora = 2_000_000;
    assert.equal(puedeMostrarse("primera-clase", { ...base, ahora, ultimoEn: ahora - 1000 }), false);
    assert.equal(puedeMostrarse("primera-clase", { ...base, ahora, ultimoEn: ahora - ESPERA_ENTRE_CONSEJOS_MS }), true);
  });
  it("se pueden apagar", () => {
    assert.equal(puedeMostrarse("primera-clase", { ...base, activos: false }), false);
    assert.equal(puedeMostrarse("primera-clase", { ...base, activos: true }), true);
  });
});
