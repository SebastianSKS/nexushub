import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fechaRelativa } from "../src/lib/canales/fecha.ts";

const ahora = Date.parse("2026-09-27T12:00:00Z");
const hace = (segundos: number) => new Date(ahora - segundos * 1000).toISOString();

describe("fechaRelativa", () => {
  it("menos de un minuto: «hace un momento»", () => {
    assert.equal(fechaRelativa(hace(5), ahora), "hace un momento");
    assert.equal(fechaRelativa(hace(59), ahora), "hace un momento");
  });
  it("una fecha futura no es negativa: cuenta como «hace un momento»", () => {
    assert.equal(fechaRelativa(hace(-500), ahora), "hace un momento");
  });
  it("minutos y horas", () => {
    assert.equal(fechaRelativa(hace(60), ahora), "hace 1 minuto");
    assert.equal(fechaRelativa(hace(45 * 60), ahora), "hace 45 minutos");
    assert.equal(fechaRelativa(hace(3600), ahora), "hace 1 hora");
    assert.equal(fechaRelativa(hace(5 * 3600), ahora), "hace 5 horas");
  });
  it("días: «ayer» y «hace 3 días»", () => {
    assert.equal(fechaRelativa(hace(24 * 3600), ahora), "ayer");
    assert.equal(fechaRelativa(hace(3 * 24 * 3600), ahora), "hace 3 días");
  });
  it("semanas y meses", () => {
    assert.equal(fechaRelativa(hace(14 * 24 * 3600), ahora), "hace 2 semanas");
    assert.equal(fechaRelativa(hace(60 * 24 * 3600), ahora), "hace 2 meses");
  });
  it("nunca dice «hace 12 meses» antes de cumplirse el año", () => {
    assert.equal(fechaRelativa(hace(364 * 24 * 3600), ahora), "hace 11 meses");
  });
  it("años", () => {
    assert.equal(fechaRelativa(hace(365 * 24 * 3600), ahora), "hace 1 año");
    assert.equal(fechaRelativa(hace(800 * 24 * 3600), ahora), "hace 2 años");
  });
  it("una fecha que no se puede leer da texto vacío", () => {
    assert.equal(fechaRelativa("no es fecha", ahora), "");
    assert.equal(fechaRelativa("", ahora), "");
  });
});
