import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ErrorCalculo, evaluar, formatear } from "../src/lib/calculadora/evaluar.ts";

const calc = (texto: string, grados = true) => evaluar(texto, { grados, ans: 0 });

describe("calculadora", () => {
  it("respeta el orden de las operaciones y los paréntesis", () => {
    assert.equal(calc("2+3*4"), 14);
    assert.equal(calc("(2+3)*4"), 20);
    assert.equal(calc("10/4"), 2.5);
    assert.equal(calc("2^10"), 1024);
  });

  it("los ángulos van en grados o en radianes según se pida", () => {
    assert.ok(Math.abs(calc("sin(30)", true) - 0.5) < 1e-9);
    assert.ok(Math.abs(calc("sin(0)", false)) < 1e-9);
  });

  it("no ejecuta código: lo que no entiende es un error de cálculo", () => {
    assert.throws(() => calc("process.exit()"), ErrorCalculo);
    assert.throws(() => calc("alert(1)"), ErrorCalculo);
    assert.throws(() => calc("2+"), ErrorCalculo);
  });

  it("da los resultados enteros sin decimales", () => {
    assert.equal(formatear(14), "14");
  });
});
