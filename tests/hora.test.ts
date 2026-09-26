import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatearHora, horaEnPunto, MARCAS_EN } from "../src/lib/hora.ts";

describe("formatearHora", () => {
  it("en 24 horas deja la hora con dos cifras", () => {
    assert.equal(formatearHora("14:30", "24h"), "14:30");
    assert.equal(formatearHora("07:05", "24h"), "07:05");
    assert.equal(formatearHora("7:05", "24h"), "07:05");
    assert.equal(formatearHora("00:00", "24h"), "00:00");
  });

  it("en 12 horas: mañana, tarde, mediodía y medianoche", () => {
    assert.equal(formatearHora("00:00", "12h"), "12:00 a. m.");
    assert.equal(formatearHora("00:45", "12h"), "12:45 a. m.");
    assert.equal(formatearHora("07:05", "12h"), "7:05 a. m.");
    assert.equal(formatearHora("11:59", "12h"), "11:59 a. m.");
    assert.equal(formatearHora("12:00", "12h"), "12:00 p. m.");
    assert.equal(formatearHora("13:10", "12h"), "1:10 p. m.");
    assert.equal(formatearHora("23:59", "12h"), "11:59 p. m.");
  });

  it("con las marcas en inglés", () => {
    assert.equal(formatearHora("08:00", "12h", MARCAS_EN), "8:00 AM");
    assert.equal(formatearHora("20:15", "12h", MARCAS_EN), "8:15 PM");
  });

  it("lo que no es una hora se devuelve igual", () => {
    for (const raro of ["", "24:00", "12:60", "mañana", "9", "9:5"]) {
      assert.equal(formatearHora(raro, "12h"), raro);
      assert.equal(formatearHora(raro, "24h"), raro);
    }
  });
});

describe("horaEnPunto", () => {
  it("escribe las horas en punto en los dos formatos", () => {
    assert.equal(horaEnPunto(6, "24h"), "06:00");
    assert.equal(horaEnPunto(6, "12h"), "6:00 a. m.");
    assert.equal(horaEnPunto(0, "12h"), "12:00 a. m.");
    assert.equal(horaEnPunto(15, "12h", MARCAS_EN), "3:00 PM");
  });
});
