import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aMinutos, clasesDelDia, colorDeTexto, deMinutos, diaDeSemana, estadoDelDia, PATRON_HORA, proximoDiaConClases, type Clase } from "../src/lib/horario/horario.ts";

const clase = (id: string, dia: number, inicio: string, fin: string): Clase => ({ id, materia: `Materia ${id}`, codigo: "", docente: "", aula: "", dia, inicio, fin, color: "#0078D4" });
// Un 26 de septiembre de 2026 (sábado, día 5 con el lunes en 0) a la hora indicada.
const a = (h: number, m = 0, dia = 26) => new Date(2026, 8, dia, h, m);

describe("horas y minutos", () => {
  it("aMinutos y deMinutos son inversas", () => {
    for (const hhmm of ["00:00", "07:05", "12:30", "23:59"]) assert.equal(deMinutos(aMinutos(hhmm)), hhmm);
    assert.equal(aMinutos("09:40"), 580);
    assert.equal(deMinutos(75), "01:15");
  });
  it("el patrón acepta solo horas de verdad con dos cifras", () => {
    for (const ok of ["00:00", "09:05", "19:59", "23:59"]) assert.ok(PATRON_HORA.test(ok), ok);
    for (const mal of ["24:00", "7:00", "12:60", "12-30", "", "1230"]) assert.equal(PATRON_HORA.test(mal), false, mal);
  });
});

describe("diaDeSemana", () => {
  it("el lunes es 0 y el domingo 6", () => {
    assert.equal(diaDeSemana(new Date(2026, 8, 21)), 0);
    assert.equal(diaDeSemana(new Date(2026, 8, 26)), 5);
    assert.equal(diaDeSemana(new Date(2026, 8, 27)), 6);
  });
});

describe("clasesDelDia", () => {
  it("filtra por día y ordena por hora de inicio", () => {
    const lista = [clase("c", 1, "11:00", "12:00"), clase("a", 1, "07:00", "08:00"), clase("x", 2, "08:00", "09:00"), clase("b", 1, "09:00", "10:00")];
    assert.deepEqual(clasesDelDia(lista, 1).map((c) => c.id), ["a", "b", "c"]);
    assert.deepEqual(clasesDelDia(lista, 4), []);
  });
});

describe("estadoDelDia", () => {
  const lista = [clase("a", 2, "07:00", "09:00"), clase("b", 2, "09:00", "11:00"), clase("c", 2, "13:00", "14:00"), clase("d", 2, "15:00", "16:00")];
  const estados = (h: number, m = 0) => estadoDelDia(lista, 2, a(h, m)).map((x) => `${x.clase.id}:${x.estado}`);

  it("antes de la primera: la primera es «siguiente» y las demás «después»", () => {
    assert.deepEqual(estados(6), ["a:siguiente", "b:despues", "c:despues", "d:despues"]);
  });
  it("en plena clase: esa es «ahora», la que sigue «siguiente»", () => {
    assert.deepEqual(estados(8, 30), ["a:ahora", "b:siguiente", "c:despues", "d:despues"]);
  });
  it("justo cuando termina una y empieza otra, ya es la nueva", () => {
    assert.deepEqual(estados(9), ["a:terminada", "b:ahora", "c:siguiente", "d:despues"]);
  });
  it("entre clases: la terminada, y la que falta es la siguiente", () => {
    assert.deepEqual(estados(12), ["a:terminada", "b:terminada", "c:siguiente", "d:despues"]);
  });
  it("al acabar el día todas están terminadas", () => {
    assert.deepEqual(estados(17), ["a:terminada", "b:terminada", "c:terminada", "d:terminada"]);
  });
});

describe("proximoDiaConClases", () => {
  const lista = [clase("l", 0, "08:00", "09:00"), clase("m", 2, "10:00", "11:00")];
  it("sin clases no hay próximo día", () => {
    assert.equal(proximoDiaConClases([], a(8)), null);
  });
  it("hoy mismo, si todavía queda alguna", () => {
    // Lunes 21 a las 07:00: aún falta la clase de las 08:00.
    assert.deepEqual(proximoDiaConClases(lista, a(7, 0, 21)), { dia: 0, faltan: 0 });
  });
  it("si hoy ya terminaron, el siguiente día con clases", () => {
    assert.deepEqual(proximoDiaConClases(lista, a(12, 0, 21)), { dia: 2, faltan: 2 });
  });
  it("da la vuelta a la semana", () => {
    // Sábado 26: lo próximo es el lunes 28 (faltan 2).
    assert.deepEqual(proximoDiaConClases(lista, a(10)), { dia: 0, faltan: 2 });
  });
});

describe("colorDeTexto", () => {
  it("texto oscuro sobre colores claros y blanco sobre oscuros", () => {
    assert.equal(colorDeTexto("#FFFFFF"), "#1b1b1b");
    assert.equal(colorDeTexto("#FFEB3B"), "#1b1b1b");
    assert.equal(colorDeTexto("#000000"), "#ffffff");
    assert.equal(colorDeTexto("#0078D4"), "#ffffff");
    assert.equal(colorDeTexto("#C42B1C"), "#ffffff");
  });
});
