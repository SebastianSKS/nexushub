import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Clase } from "../src/lib/horario/horario.ts";
import { crearHorarioCompartido, FORMATO_HORARIO, nombreDeArchivoHorario, textoDeHorario, VERSION_HORARIO } from "../src/lib/horario/compartir.ts";

const clase = (p: Partial<Clase> = {}): Clase => ({ id: "c1", materia: "Cálculo", codigo: "MAT-1010", docente: "Dra. Ríos", aula: "A-12", dia: 0, inicio: "08:00", fin: "09:40", color: "#4f8cff", ...p });
const ahora = new Date(2026, 8, 27, 10, 30);

describe("crearHorarioCompartido y textoDeHorario", () => {
  it("lleva la marca del formato, la versión y la fecha", () => {
    const h = crearHorarioCompartido([clase()], ahora);
    assert.equal(h.formato, FORMATO_HORARIO);
    assert.equal(h.version, VERSION_HORARIO);
    assert.equal(h.creado, ahora.toISOString());
    assert.equal(h.clases.length, 1);
  });
  it("copia las clases: cambiar el original no cambia lo compartido", () => {
    const original = clase();
    const h = crearHorarioCompartido([original]);
    original.materia = "Otra";
    assert.equal(h.clases[0]!.materia, "Cálculo");
  });
  it("el texto es JSON que se puede volver a leer", () => {
    const t = textoDeHorario([clase(), clase({ id: "c2", dia: 2 })], ahora);
    assert.equal(JSON.parse(t).clases.length, 2);
    assert.ok(t.includes("\n  "), "con sangría, para poder abrirlo");
  });
  it("un horario vacío también es un archivo válido", () => {
    assert.deepEqual(JSON.parse(textoDeHorario([], ahora)).clases, []);
  });
});

describe("nombreDeArchivoHorario", () => {
  it("lleva la fecha con ceros", () => {
    assert.equal(nombreDeArchivoHorario(new Date(2026, 0, 5)), "Nexo-horario-2026-01-05.json");
    assert.equal(nombreDeArchivoHorario(ahora), "Nexo-horario-2026-09-27.json");
  });
});
