import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ESCALA_CIEN, ESCALA_DIEZ, pesoEvaluado, pesoPendiente, redondear, type Evaluacion } from "../src/lib/promedio.ts";

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
