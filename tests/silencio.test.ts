import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enHorasDeSilencio, horaValida, textoDeHora } from "../src/lib/silencio.ts";

const a = (h: number, m = 0) => new Date(2026, 8, 26, h, m);

describe("enHorasDeSilencio", () => {
  it("apagado, nunca calla", () => {
    for (let h = 0; h < 24; h++) assert.equal(enHorasDeSilencio(a(h), { activo: false, desde: 0, hasta: 23 }), false);
  });

  it("dentro del mismo día: de 13 a 15", () => {
    const c = { activo: true, desde: 13, hasta: 15 };
    assert.equal(enHorasDeSilencio(a(12, 59), c), false);
    assert.equal(enHorasDeSilencio(a(13, 0), c), true);
    assert.equal(enHorasDeSilencio(a(14, 59), c), true);
    assert.equal(enHorasDeSilencio(a(15, 0), c), false);
  });

  it("cruzando la medianoche: de 22 a 7", () => {
    const c = { activo: true, desde: 22, hasta: 7 };
    assert.equal(enHorasDeSilencio(a(21, 59), c), false);
    assert.equal(enHorasDeSilencio(a(22, 0), c), true);
    assert.equal(enHorasDeSilencio(a(23, 30), c), true);
    assert.equal(enHorasDeSilencio(a(0, 0), c), true);
    assert.equal(enHorasDeSilencio(a(6, 59), c), true);
    assert.equal(enHorasDeSilencio(a(7, 0), c), false);
    assert.equal(enHorasDeSilencio(a(12), c), false);
  });

  it("«desde» igual a «hasta» no silencia nada", () => {
    for (let h = 0; h < 24; h++) assert.equal(enHorasDeSilencio(a(h), { activo: true, desde: 9, hasta: 9 }), false);
  });
});

describe("horaValida y textoDeHora", () => {
  it("acepta enteros de 0 a 23 y usa la reserva con lo demás", () => {
    assert.equal(horaValida(0, 5), 0);
    assert.equal(horaValida(23, 5), 23);
    for (const x of [24, -1, 1.5, "7", null, undefined, Number.NaN]) assert.equal(horaValida(x, 5), 5);
  });
  it("pone el cero delante", () => {
    assert.equal(textoDeHora(7), "07:00");
    assert.equal(textoDeHora(22), "22:00");
  });
});
