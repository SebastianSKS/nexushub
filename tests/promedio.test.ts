import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calificacionFinal, ESCALA_CIEN, ESCALA_DIEZ, pesoEvaluado, pesoPendiente, promedioParcial, puntosGanados, redondear, type Evaluacion } from "../src/lib/promedio.ts";

describe("escalas", () => {
  it("la de 10 aprueba con 6 y la de 100 con 70", () => {
    assert.deepEqual(ESCALA_DIEZ, { maximo: 10, minimoAprobatorio: 6 });
    assert.deepEqual(ESCALA_CIEN, { maximo: 100, minimoAprobatorio: 70 });
  });
});

describe("redondear", () => {
  it("redondea al decimal pedido", () => {
    assert.equal(redondear(8.46), 8.5);
    assert.equal(redondear(8.44), 8.4);
    assert.equal(redondear(7, 2), 7);
  });
  it("no cae en los errores de la coma flotante", () => {
    assert.equal(redondear(1.005, 2), 1.01);
    assert.equal(redondear(0.1 + 0.2, 2), 0.3);
  });
});

const ev = (peso: number, calificacion: number | null, nombre = "x"): Evaluacion => ({ id: nombre + peso, nombre, peso, calificacion });

describe("pesoEvaluado y pesoPendiente", () => {
  it("solo cuentan las evaluaciones ya calificadas", () => {
    const lista = [ev(30, 8), ev(30, null), ev(20, 9)];
    assert.equal(pesoEvaluado(lista), 50);
    assert.equal(pesoPendiente(lista), 50);
  });
  it("sin nada calificado falta todo", () => {
    assert.equal(pesoEvaluado([]), 0);
    assert.equal(pesoPendiente([ev(40, null)]), 100);
  });
  it("con todo calificado no falta nada, y nunca sale negativo", () => {
    assert.equal(pesoPendiente([ev(60, 7), ev(40, 9)]), 0);
    assert.equal(pesoPendiente([ev(70, 7), ev(50, 9)]), 0);
  });
});

describe("puntosGanados", () => {
  it("cada calificación cuenta por su peso", () => {
    assert.equal(redondear(puntosGanados([ev(30, 8), ev(20, 10)]), 2), 4.4);
  });
  it("lo que no está calificado no suma", () => {
    assert.equal(puntosGanados([ev(50, null)]), 0);
  });
});

describe("promedioParcial", () => {
  it("es el promedio de lo calificado, ponderado", () => {
    // 8 con peso 30 y 10 con peso 20: (2.4 + 2) / 0.5 = 8.8
    assert.equal(redondear(promedioParcial([ev(30, 8), ev(20, 10), ev(50, null)])!, 2), 8.8);
  });
  it("sin calificaciones no hay promedio", () => {
    assert.equal(promedioParcial([]), null);
    assert.equal(promedioParcial([ev(40, null)]), null);
  });
  it("con una sola calificación, es esa", () => {
    assert.equal(promedioParcial([ev(15, 7.5)]), 7.5);
  });
});

describe("calificacionFinal", () => {
  it("con todo calificado es la suma ponderada", () => {
    assert.equal(redondear(calificacionFinal([ev(60, 8), ev(40, 9)])!, 2), 8.4);
  });
  it("mientras falte algo por calificar no hay final", () => {
    assert.equal(calificacionFinal([ev(60, 8), ev(40, null)]), null);
    assert.equal(calificacionFinal([ev(60, 8)]), null);
  });
  it("tolera pesos con decimales que suman 100", () => {
    assert.notEqual(calificacionFinal([ev(33.3, 9), ev(33.3, 9), ev(33.4, 9)]), null);
  });
});
