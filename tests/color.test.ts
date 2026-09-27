import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORIAS, COLOR_CUMPLE, esCategoria, infoCategoria } from "../src/lib/calendario/categorias.ts";
import { colorDeTexto } from "../src/lib/color.ts";

describe("colorDeTexto", () => {
  it("texto oscuro sobre fondos claros", () => {
    for (const claro of ["#ffffff", "#ffeb3b", "#e0e0e0", "#a0f0c0"]) assert.equal(colorDeTexto(claro), "#1b1b1b", claro);
  });
  it("texto blanco sobre fondos oscuros", () => {
    for (const oscuro of ["#000000", "#1b4fd8", "#8b0000", "#333333"]) assert.equal(colorDeTexto(oscuro), "#ffffff", oscuro);
  });
  it("los colores de las clases del horario se leen bien", () => {
    // los seis colores que Nexo ofrece: cada uno con un texto que contraste
    assert.equal(colorDeTexto("#f0812a"), "#ffffff");
    assert.equal(colorDeTexto("#2ec4a6"), "#ffffff");
  });
});

describe("categorías de eventos", () => {
  it("hay cinco, con ids distintos y colores válidos", () => {
    assert.equal(CATEGORIAS.length, 5);
    assert.equal(new Set(CATEGORIAS.map((c) => c.id)).size, 5);
    for (const c of CATEGORIAS) assert.match(c.color, /^#[0-9a-f]{6}$/i);
    assert.match(COLOR_CUMPLE, /^#[0-9a-f]{6}$/i);
  });
  it("esCategoria distingue lo válido de lo demás", () => {
    assert.equal(esCategoria("examen"), true);
    for (const malo of ["Examen", "", null, undefined, 3, {}]) assert.equal(esCategoria(malo), false);
  });
  it("infoCategoria devuelve la pedida y «otro» si no se conoce", () => {
    assert.equal(infoCategoria("cita").nombre, "Cita");
    assert.equal(infoCategoria("no-existe" as never).id, "otro");
  });
});
