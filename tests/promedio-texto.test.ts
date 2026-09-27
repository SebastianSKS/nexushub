import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ESCALA_CIEN, ESCALA_DIEZ } from "../src/lib/promedio.ts";
import { avisoDePesos, fraseDeNecesario, textoDeEstado } from "../src/lib/promedio-texto.ts";

describe("textoDeEstado", () => {
  it("cada estado tiene su texto", () => {
    assert.equal(textoDeEstado("en-riesgo"), "En riesgo");
    assert.equal(textoDeEstado("sin-datos"), "Sin calificaciones todavía");
    assert.equal(textoDeEstado("aprobada"), "Aprobada");
  });
});

describe("fraseDeNecesario", () => {
  it("lo que necesitas y lo que falta", () => {
    assert.equal(fraseDeNecesario({ tipo: "necesitas", calificacion: 4.25 }, ESCALA_DIEZ, 50), "Necesitas al menos 4.3 en lo que falta (50 % de la materia).");
  });
  it("ya aprobada, con el mínimo de la escala", () => {
    assert.equal(fraseDeNecesario({ tipo: "aprobada" }, ESCALA_CIEN, 30), "Con lo que llevas ya alcanzas el mínimo para aprobar (70).");
  });
  it("terminada, aprobó o no", () => {
    assert.equal(fraseDeNecesario({ tipo: "terminada", aprobada: true }, ESCALA_DIEZ, 0), "Materia terminada: aprobaste.");
    assert.equal(fraseDeNecesario({ tipo: "terminada", aprobada: false }, ESCALA_DIEZ, 0), "Materia terminada: no llegaste al mínimo (6).");
  });
  it("imposible, y hasta dónde llegarías", () => {
    assert.equal(fraseDeNecesario({ tipo: "imposible", maxima: 3.6 }, ESCALA_DIEZ, 20), "Ni con 10 en lo que falta llegarías al mínimo (6): lo máximo que alcanzarías es 3.6.");
  });
});

describe("avisoDePesos", () => {
  it("sin aviso cuando suman 100", () => {
    assert.equal(avisoDePesos(100), null);
    assert.equal(avisoDePesos(99.99999), null); // los decimales de un reparto en tercios
  });
  it("avisa si faltan o si sobran", () => {
    assert.equal(avisoDePesos(80), "Los pesos suman 80 %: aún falta repartir el 20 %.");
    assert.equal(avisoDePesos(120), "Los pesos suman 120 %: se pasan del 100 %.");
  });
});
