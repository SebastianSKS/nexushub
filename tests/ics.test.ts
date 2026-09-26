import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generarIcs, parsearIcs } from "../src/lib/calendario/ics.ts";
import type { Amigo, Evento } from "../src/store/calendario-store.ts";

const amigo = (p: Partial<Amigo> = {}): Amigo => ({ id: "a1", nombre: "Ana Pérez", dia: 14, mes: 3, anio: 2005, color: "#e5509f", nota: "", avisar: true, ...p });
const evento = (p: Partial<Evento> = {}): Evento => ({ id: "e1", titulo: "Examen de física", categoria: "examen", fecha: "2026-10-05", hora: "08:30", color: "#e5484d", nota: "", avisar: true, repetir: "no", ...p });

describe("generarIcs", () => {
  it("es un calendario con final de línea CRLF y un evento por cada cosa", () => {
    const ics = generarIcs([amigo()], [evento(), evento({ id: "e2", hora: null, titulo: "Entrega" })]);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 3);
    assert.equal((ics.match(/END:VEVENT/g) ?? []).length, 3);
  });

  it("los cumpleaños se repiten cada año y los eventos con hora llevan la hora", () => {
    const ics = generarIcs([amigo()], [evento()]);
    assert.match(ics, /DTSTART;VALUE=DATE:20050314\r\nRRULE:FREQ=YEARLY/);
    assert.match(ics, /DTSTART:20261005T083000/);
    assert.match(ics, /CATEGORIES:EXAMEN/);
  });

  it("escapa comas, puntos y comas, barras y saltos de línea", () => {
    const ics = generarIcs([], [evento({ titulo: "A, B; C\\D", nota: "línea 1\nlínea 2" })]);
    assert.match(ics, /SUMMARY:A\\, B\\; C\\\\D/);
    assert.match(ics, /DESCRIPTION:línea 1\\nlínea 2/);
  });

  it("un cumpleaños sin año usa uno bisiesto de reserva (admite el 29 de febrero)", () => {
    const ics = generarIcs([amigo({ anio: null, dia: 29, mes: 2 })], []);
    assert.match(ics, /DTSTART;VALUE=DATE:20000229/);
  });
});

describe("parsearIcs", () => {
  it("lee de vuelta lo que exporta: cumpleaños y eventos", () => {
    const r = parsearIcs(generarIcs([amigo()], [evento({ repetir: "semanal", nota: "Traer calculadora" })]));
    assert.equal(r.omitidos, 0);
    assert.equal(r.amigos.length, 1);
    assert.deepEqual([r.amigos[0]!.nombre, r.amigos[0]!.dia, r.amigos[0]!.mes, r.amigos[0]!.anio], ["Ana Pérez", 14, 3, 2005]);
    assert.equal(r.eventos.length, 1);
    const e = r.eventos[0]!;
    assert.deepEqual([e.titulo, e.fecha, e.hora, e.categoria, e.repetir, e.nota], ["Examen de física", "2026-10-05", "08:30", "examen", "semanal", "Traer calculadora"]);
  });

  it("un cumpleaños sin año conocido vuelve sin año", () => {
    const r = parsearIcs(generarIcs([amigo({ anio: null })], []));
    assert.equal(r.amigos[0]!.anio, null);
  });

  it("entiende líneas largas desplegadas, saltos de línea sueltos y eventos de todo el día", () => {
    const texto = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261101", "SUMMARY:Un título muy lar", " go que se partió", "END:VEVENT", "END:VCALENDAR"].join("\n");
    const r = parsearIcs(texto);
    assert.equal(r.eventos[0]!.titulo, "Un título muy largo que se partió");
    assert.equal(r.eventos[0]!.hora, null);
    assert.equal(r.eventos[0]!.fecha, "2026-11-01");
  });

  it("los eventos sin fecha o sin título se cuentan como omitidos", () => {
    const texto = "BEGIN:VEVENT\r\nSUMMARY:Sin fecha\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:20261101\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:20261102\r\nSUMMARY:Bien\r\nEND:VEVENT\r\n";
    const r = parsearIcs(texto);
    assert.equal(r.omitidos, 2);
    assert.equal(r.eventos.length, 1);
  });

  it("quita «Cumpleaños de» / «Birthday of» del nombre importado", () => {
    const texto = "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20100105\r\nRRULE:FREQ=YEARLY\r\nSUMMARY:Birthday of Luis\r\nEND:VEVENT\r\n";
    assert.equal(parsearIcs(texto).amigos[0]!.nombre, "Luis");
  });

  it("no revienta con basura", () => {
    for (const basura of ["", "hola", "BEGIN:VCALENDAR\r\nEND:VCALENDAR", "BEGIN:VEVENT\r\nSUMMARY:sin fin"]) {
      const r = parsearIcs(basura);
      assert.equal(r.amigos.length + r.eventos.length, 0);
    }
  });

  it("las categorías desconocidas quedan como «otro»", () => {
    const texto = "BEGIN:VEVENT\r\nDTSTART:20261101\r\nSUMMARY:X\r\nCATEGORIES:INVENTADA\r\nEND:VEVENT\r\n";
    assert.equal(parsearIcs(texto).eventos[0]!.categoria, "otro");
  });
});
