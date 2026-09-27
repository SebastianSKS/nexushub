import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claseValida } from "../src/lib/horario/validar.ts";

const buena = { id: "c1", materia: "  Cálculo  ", codigo: "MAT-1010", docente: "Dra. Ríos", aula: "A-12", dia: 0, inicio: "08:00", fin: "09:40", color: "#4f8cff" };

describe("claseValida", () => {
  it("acepta una clase completa y limpia el nombre", () => {
    assert.deepEqual(claseValida(buena), { ...buena, materia: "Cálculo" });
  });
  it("lo que no es un objeto no sirve", () => {
    for (const malo of [null, undefined, "x", 4, [], true]) assert.equal(claseValida(malo), null);
  });
  it("necesita id y materia", () => {
    assert.equal(claseValida({ ...buena, id: 3 }), null);
    assert.equal(claseValida({ ...buena, materia: "   " }), null);
    assert.equal(claseValida({ ...buena, materia: 5 }), null);
  });
  it("el día va de 0 (lunes) a 6 (domingo) y es entero", () => {
    assert.equal(claseValida({ ...buena, dia: -1 }), null);
    assert.equal(claseValida({ ...buena, dia: 7 }), null);
    assert.equal(claseValida({ ...buena, dia: 1.5 }), null);
    assert.equal(claseValida({ ...buena, dia: 6 })?.dia, 6);
  });
  it("las horas tienen el formato HH:MM y el fin es después del inicio", () => {
    assert.equal(claseValida({ ...buena, inicio: "8:00" }), null);
    assert.equal(claseValida({ ...buena, fin: "25:00" }), null);
    assert.equal(claseValida({ ...buena, inicio: "10:00", fin: "10:00" }), null);
    assert.equal(claseValida({ ...buena, inicio: "10:00", fin: "09:00" }), null);
  });
  it("corta los textos largos y pone un color por defecto si el suyo no vale", () => {
    const c = claseValida({ ...buena, materia: "m".repeat(90), codigo: "c".repeat(50), docente: "d".repeat(90), aula: "a".repeat(50), color: "rojo" })!;
    assert.equal(c.materia.length, 60);
    assert.equal(c.codigo.length, 20);
    assert.equal(c.docente.length, 60);
    assert.equal(c.aula.length, 20);
    assert.equal(c.color, "#2b7de9");
  });
  it("los datos opcionales que faltan quedan vacíos", () => {
    const { codigo, docente, aula, ...minima } = buena;
    void codigo; void docente; void aula;
    const c = claseValida(minima)!;
    assert.deepEqual([c.codigo, c.docente, c.aula], ["", "", ""]);
  });
});
