import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ESCALA_CIEN, ESCALA_DIEZ, redondear } from "../src/lib/promedio.ts";

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
