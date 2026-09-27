import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Clase } from "../src/lib/horario/horario.ts";
import { crearHorarioCompartido, FORMATO_HORARIO, leerHorarioCompartido, MAX_BYTES_HORARIO, MAX_CLASES_HORARIO, nombreDeArchivoHorario, textoDeHorario, VERSION_HORARIO } from "../src/lib/horario/compartir.ts";

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

const ids = () => {
  let n = 0;
  return () => `nuevo${++n}`;
};

describe("leerHorarioCompartido", () => {
  it("lee lo que se guardó y da ids nuevos", () => {
    const r = leerHorarioCompartido(textoDeHorario([clase(), clase({ id: "c2", dia: 3 })]), ids());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.clases.map((c) => c.id), ["nuevo1", "nuevo2"]);
      assert.equal(r.descartadas, 0);
      assert.equal(r.clases[1]!.dia, 3);
    }
  });
  it("lo que no es JSON o no es un horario da un motivo claro", () => {
    for (const malo of ["hola", "{", "[]", "null", JSON.stringify({ formato: "otra-cosa", clases: [] })]) {
      const r = leerHorarioCompartido(malo, ids());
      assert.equal(r.ok, false, malo);
    }
    const r = leerHorarioCompartido("hola", ids());
    assert.equal(!r.ok && r.motivo, "El archivo no se pudo leer: no es un horario de Nexo.");
  });
  it("una versión más nueva se rechaza pidiendo actualizar", () => {
    const r = leerHorarioCompartido(JSON.stringify({ formato: FORMATO_HORARIO, version: 99, clases: [clase()] }), ids());
    assert.equal(!r.ok && /versión más nueva/.test(r.motivo), true);
  });
  it("descarta las clases dañadas y conserva las buenas", () => {
    const r = leerHorarioCompartido(JSON.stringify({ formato: FORMATO_HORARIO, version: 1, clases: [clase(), { materia: "sin id" }, "basura", clase({ id: "c9", inicio: "12:00", fin: "11:00" })] }), ids());
    assert.equal(r.ok && r.clases.length, 1);
    assert.equal(r.ok && r.descartadas, 3);
  });
  it("si ninguna clase sirve, es un error", () => {
    const r = leerHorarioCompartido(JSON.stringify({ formato: FORMATO_HORARIO, version: 1, clases: [{}, null] }), ids());
    assert.equal(!r.ok && r.motivo, "El horario del archivo no trae ninguna clase válida.");
  });
  it("sin lista de clases, es un error", () => {
    const r = leerHorarioCompartido(JSON.stringify({ formato: FORMATO_HORARIO, version: 1 }), ids());
    assert.equal(!r.ok && r.motivo, "El horario del archivo no trae clases.");
  });
  it("un archivo enorme no se lee", () => {
    assert.equal(leerHorarioCompartido("x".repeat(MAX_BYTES_HORARIO + 1), ids()).ok, false);
  });
  it("no pasa del máximo de clases y cuenta las que sobran como descartadas", () => {
    const muchas = Array.from({ length: MAX_CLASES_HORARIO + 10 }, (_, i) => clase({ id: "m" + i }));
    const r = leerHorarioCompartido(JSON.stringify({ formato: FORMATO_HORARIO, version: 1, clases: muchas }), ids());
    assert.equal(r.ok && r.clases.length, MAX_CLASES_HORARIO);
    assert.equal(r.ok && r.descartadas, 10);
  });
});
