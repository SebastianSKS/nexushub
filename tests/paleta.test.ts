import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizarAjustes } from "../src/lib/ajustes-base.ts";
import { aHsl, aRgb, paletaDe, type Rgb } from "../src/lib/paleta.ts";

/** Una portada de mentira: cada color ocupa los píxeles que se digan. */
const portada = (...partes: [Rgb, number][]) => partes.flatMap(([[r, g, b], n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat());
const tono = (c: Rgb) => aHsl(...c)[0];
const cerca = (a: number, b: number, margen = 20) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= margen;

describe("colores de la portada", () => {
  it("convierte de ida y vuelta", () => {
    for (const color of [[200, 30, 30], [20, 180, 90], [40, 60, 220], [128, 128, 128]] as Rgb[]) {
      aRgb(...aHsl(...color)).forEach((v, i) => assert.ok(Math.abs(v - color[i]!) <= 2, color.join()));
    }
  });

  it("toma los tonos que más se ven, el principal primero", () => {
    const [a, b, c] = paletaDe(portada([[210, 30, 30], 500], [[30, 60, 210], 300], [[30, 180, 60], 150], [[5, 5, 5], 400]))!;
    assert.ok(cerca(tono(a), 0), "rojo primero");
    assert.ok(cerca(tono(b), 230), "luego azul");
    assert.ok(cerca(tono(c), 132), "y verde");
  });

  it("el negro y el blanco no ganan aunque ocupen casi todo", () => {
    const [a] = paletaDe(portada([[0, 0, 0], 800], [[255, 255, 255], 150], [[220, 120, 20], 60]))!;
    assert.ok(cerca(tono(a), 30));
  });

  it("de un solo color salen tres tonos vecinos, ni muy oscuros ni muy claros", () => {
    const colores = paletaDe(portada([[90, 0, 140], 600]))!;
    assert.equal(new Set(colores.map((c) => c.join())).size, 3);
    for (const c of colores) {
      const [h, s, l] = aHsl(...c);
      assert.ok(cerca(h, 278, 40) && s >= 0.4 && l >= 0.28 && l <= 0.64, c.join());
    }
  });

  it("una portada en blanco y negro da tonos neutros", () => {
    for (const c of paletaDe(portada([[0, 0, 0], 300], [[200, 200, 200], 300]))!) assert.ok(aHsl(...c)[1] <= 0.14, c.join());
  });

  it("sin nada visible no hay colores", () => {
    assert.equal(paletaDe([]), null);
    assert.equal(paletaDe([255, 0, 0, 0]), null);
  });

  it("viene encendido y se puede apagar; lo guardado se respeta", () => {
    assert.equal(normalizarAjustes({}).fondoMusical, true);
    assert.equal(normalizarAjustes({ fondoMusical: false }).fondoMusical, false);
  });
});
