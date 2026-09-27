import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { debeMostrarse, normalizarPasosGuardados, PASOS, PASOS_GUARDADOS_INICIAL, pasosDe, progresoDe, type EstadoPasos } from "../src/lib/primeros-pasos.ts";

const nada: EstadoPasos = { nombre: false, horario: false, carpetas: false, examen: false, buscador: false };
const todo: EstadoPasos = { nombre: true, horario: true, carpetas: true, examen: true, buscador: true };

describe("los pasos", () => {
  it("son cinco, sin repetir, y cada uno dice qué hacer", () => {
    assert.equal(PASOS.length, 5);
    assert.equal(new Set(PASOS.map((p) => p.id)).size, 5);
    for (const p of PASOS) assert.ok(p.titulo && p.texto && p.accion, p.id);
  });

  it("las rutas son de Nexo", () => {
    for (const p of PASOS) if (p.ruta) assert.match(p.ruta, /^\/[a-z]/, p.id);
  });

  it("en la versión web no está el paso de las carpetas (solo existen en escritorio)", () => {
    assert.equal(pasosDe(true).length, 5);
    assert.deepEqual(pasosDe(false).map((p) => p.id), ["nombre", "horario", "examen", "buscador"]);
  });
});

describe("progresoDe", () => {
  it("sin nada hecho, el primero es el siguiente", () => {
    assert.deepEqual(progresoDe(nada, true), { hechos: 0, total: 5, siguiente: "nombre", completo: false });
  });
  it("el siguiente es el primero que falta, aunque haya hechos después", () => {
    const p = progresoDe({ ...nada, nombre: true, examen: true }, true);
    assert.equal(p.hechos, 2);
    assert.equal(p.siguiente, "horario");
  });
  it("con todo hecho está completo y no hay siguiente", () => {
    assert.deepEqual(progresoDe(todo, true), { hechos: 5, total: 5, siguiente: null, completo: true });
  });
  it("en web, las carpetas no cuentan: sin ese paso se completa con los otros cuatro", () => {
    const p = progresoDe({ ...todo, carpetas: false }, false);
    assert.deepEqual([p.hechos, p.total, p.completo], [4, 4, true]);
  });
});

describe("normalizarPasosGuardados", () => {
  it("solo un true claro cuenta como verdadero", () => {
    assert.deepEqual(normalizarPasosGuardados({ buscador: true, carpetas: "si", descartado: 1, completado: true }), { buscador: true, carpetas: false, descartado: false, completado: true });
  });
  it("con basura, todo falso", () => {
    for (const malo of [null, undefined, 5, "x", []]) assert.deepEqual(normalizarPasosGuardados(malo), PASOS_GUARDADOS_INICIAL);
  });
});

describe("debeMostrarse", () => {
  const base = { guardado: PASOS_GUARDADOS_INICIAL, progreso: progresoDe(nada, true), cargado: true, bienvenidaVista: true, algoAbierto: false };

  it("sale cuando todo está tranquilo y falta algo", () => {
    assert.equal(debeMostrarse(base), true);
  });
  it("espera a que se lea lo guardado (sin parpadeos)", () => {
    assert.equal(debeMostrarse({ ...base, cargado: false }), false);
  });
  it("no sale antes de la guía de bienvenida: esa va primero", () => {
    assert.equal(debeMostrarse({ ...base, bienvenidaVista: false }), false);
  });
  it("no se apila con una guía ni con las novedades", () => {
    assert.equal(debeMostrarse({ ...base, algoAbierto: true }), false);
  });
  it("respeta a quien la ocultó y a quien ya la terminó", () => {
    assert.equal(debeMostrarse({ ...base, guardado: { ...PASOS_GUARDADOS_INICIAL, descartado: true } }), false);
    assert.equal(debeMostrarse({ ...base, guardado: { ...PASOS_GUARDADOS_INICIAL, completado: true } }), false);
  });
  it("a quien ya lo tenía todo hecho no se le muestra", () => {
    assert.equal(debeMostrarse({ ...base, progreso: progresoDe(todo, true) }), false);
  });
});
