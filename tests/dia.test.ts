import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esUrgente, estadoDelDia, hayAlgoQueMostrar, partesDeDuracion, pendientesDeNotas, proximosDeLaSemana, type AmigoBase, type EventoBase } from "../src/lib/dia.ts";
import type { Clase } from "../src/lib/horario/horario.ts";

const clase = (id: string, dia: number, inicio: string, fin: string): Clase => ({ id, materia: `Materia ${id}`, codigo: "", docente: "", aula: "A-1", dia, inicio, fin, color: "#0078D4" });
// Sábado 26 de septiembre de 2026 (día 5 con el lunes en 0), o el día del mes que se pida.
const a = (h: number, m = 0, dia = 26) => new Date(2026, 8, dia, h, m);
const ev = (p: Partial<EventoBase> = {}): EventoBase => ({ id: "e1", titulo: "Examen", categoria: "examen", fecha: "2026-09-26", hora: null, color: "#e5484d", repetir: "no", ...p });
const amigo = (p: Partial<AmigoBase> = {}): AmigoBase => ({ id: "a1", nombre: "Luis", dia: 27, mes: 9, anio: 2005, color: "#e5509f", ...p });

describe("estadoDelDia", () => {
  // Lunes 21 a las 10:00.
  const lunes = [clase("a", 0, "08:00", "09:40"), clase("b", 0, "10:00", "11:40"), clase("c", 0, "13:00", "14:00")];
  const en = (h: number, m = 0) => estadoDelDia(lunes, a(h, m, 21));

  it("sin clases cargadas no hay horario", () => {
    assert.deepEqual(estadoDelDia([], a(9)), { tipo: "sin-horario" });
  });

  it("antes de la primera: la primera es la que sigue, con los minutos que faltan", () => {
    const e = en(7, 15);
    assert.equal(e.tipo, "siguiente");
    if (e.tipo === "siguiente") assert.deepEqual([e.clase.id, e.minutosParaInicio], ["a", 45]);
  });

  it("en plena clase: cuánto falta, cuánto avanzó y cuál es la siguiente", () => {
    const e = en(10, 30);
    assert.equal(e.tipo, "en-clase");
    if (e.tipo === "en-clase") {
      assert.equal(e.clase.id, "b");
      assert.equal(e.minutosParaFin, 70);
      assert.ok(Math.abs(e.progreso - 30 / 100) < 1e-9);
      assert.deepEqual([e.siguiente?.clase.id, e.siguiente?.minutosParaInicio], ["c", 150]);
    }
  });

  it("justo al empezar una clase ya está en curso, y justo al terminar ya no", () => {
    assert.equal(en(10, 0).tipo, "en-clase");
    const fin = en(9, 40);
    assert.equal(fin.tipo, "siguiente", "a las 9:40 terminó la primera y falta la de las 10:00");
  });

  it("en la última clase no hay siguiente", () => {
    const e = en(13, 30);
    assert.equal(e.tipo, "en-clase");
    if (e.tipo === "en-clase") assert.equal(e.siguiente, null);
  });

  it("al terminar el día: terminado, y dice cuándo vuelven las clases", () => {
    const e = estadoDelDia([...lunes, clase("d", 2, "07:00", "08:00")], a(15, 0, 21));
    assert.equal(e.tipo, "terminado");
    if (e.tipo === "terminado") assert.deepEqual([e.proximoDia?.dia, e.proximoDia?.faltan, e.proximoDia?.clase.id], [2, 2, "d"]);
  });

  it("un día sin clases es «libre» y da la próxima clase de la semana (o la del lunes que viene)", () => {
    const e = estadoDelDia(lunes, a(12, 0, 26)); // sábado
    assert.equal(e.tipo, "libre");
    if (e.tipo === "libre") assert.deepEqual([e.proximoDia?.dia, e.proximoDia?.faltan, e.proximoDia?.clase.id], [0, 2, "a"]);
  });

  it("si toda la semana es un solo día, el próximo día con clases puede ser dentro de 7", () => {
    const e = estadoDelDia([clase("z", 0, "08:00", "09:00")], a(10, 0, 21));
    assert.equal(e.tipo, "terminado");
    if (e.tipo === "terminado") assert.equal(e.proximoDia?.faltan, 7);
  });
});

describe("partesDeDuracion", () => {
  it("horas y minutos", () => {
    assert.deepEqual(partesDeDuracion(45), { horas: 0, minutos: 45 });
    assert.deepEqual(partesDeDuracion(80), { horas: 1, minutos: 20 });
    assert.deepEqual(partesDeDuracion(120), { horas: 2, minutos: 0 });
    assert.deepEqual(partesDeDuracion(-5), { horas: 0, minutos: 0 });
    assert.deepEqual(partesDeDuracion(59.6), { horas: 1, minutos: 0 });
  });
});

describe("proximosDeLaSemana", () => {
  it("incluye lo de hoy y los próximos 6 días, y deja fuera lo de más adelante", () => {
    const r = proximosDeLaSemana([ev({ id: "hoy" }), ev({ id: "d6", fecha: "2026-10-02" }), ev({ id: "d7", fecha: "2026-10-03" })], [], a(9));
    assert.deepEqual(r.map((x) => x.clave), ["e-hoy", "e-d6"]);
  });

  it("un evento con hora que ya empezó hoy no cuenta; uno de todo el día, sí", () => {
    const eventos = [ev({ id: "paso", hora: "08:00" }), ev({ id: "falta", hora: "16:00" }), ev({ id: "todo", hora: null })];
    assert.deepEqual(proximosDeLaSemana(eventos, [], a(10)).map((x) => x.clave), ["e-todo", "e-falta"]);
  });

  it("mezcla cumpleaños y eventos, lo más cercano primero", () => {
    const r = proximosDeLaSemana([ev({ id: "x", fecha: "2026-09-29", titulo: "Entrega" })], [amigo()], a(9));
    assert.deepEqual(r.map((x) => [x.tipo, x.dias]), [["cumple", 1], ["evento", 3]]);
    assert.equal(r[0]!.edad, 21);
  });

  it("los que se repiten aparecen en su próxima ocurrencia", () => {
    const r = proximosDeLaSemana([ev({ id: "sem", fecha: "2026-09-01", repetir: "semanal" })], [], a(9));
    assert.equal(r.length, 1);
    assert.equal(r[0]!.dias, 3); // 1 de septiembre fue martes: el próximo es el martes 29
  });

  it("dentro del mismo día, por hora; y respeta el máximo", () => {
    const eventos = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"].map((id, i) => ev({ id, hora: `${String(20 - i).padStart(2, "0")}:00` }));
    const r = proximosDeLaSemana(eventos, [], a(6), 7, 4);
    assert.equal(r.length, 4);
    assert.deepEqual(r.map((x) => x.hora), ["14:00", "15:00", "16:00", "17:00"]);
  });

  it("no cambia las listas originales", () => {
    const eventos = [ev({ id: "b", fecha: "2026-09-28" }), ev({ id: "a", fecha: "2026-09-27" })];
    proximosDeLaSemana(eventos, [], a(9));
    assert.deepEqual(eventos.map((e) => e.id), ["b", "a"]);
  });
});

describe("esUrgente", () => {
  const item = (p: Record<string, unknown>) => ({ clave: "x", tipo: "evento" as const, titulo: "x", color: "#000", fecha: a(9), dias: 0, hora: null, ...p });
  it("un examen o una tarea de hoy o mañana", () => {
    assert.equal(esUrgente(item({ categoria: "examen", dias: 1 })), true);
    assert.equal(esUrgente(item({ categoria: "tarea", dias: 0 })), true);
  });
  it("no una cita, ni algo de dentro de tres días, ni un cumpleaños", () => {
    assert.equal(esUrgente(item({ categoria: "cita", dias: 0 })), false);
    assert.equal(esUrgente(item({ categoria: "examen", dias: 3 })), false);
    assert.equal(esUrgente(item({ tipo: "cumple", dias: 0 })), false);
  });
});

describe("pendientesDeNotas y hayAlgoQueMostrar", () => {
  const notas = [
    { id: "1", texto: "a", hecha: false },
    { id: "2", texto: "b", hecha: true },
    { id: "3", texto: "c", hecha: false },
    { id: "4", texto: "d", hecha: false },
    { id: "5", texto: "e", hecha: false },
  ];
  it("cuenta las que faltan y da las primeras", () => {
    const r = pendientesDeNotas(notas, 2);
    assert.equal(r.total, 4);
    assert.deepEqual(r.primeros.map((n) => n.id), ["1", "3"]);
  });
  it("sin notas, cero", () => {
    assert.deepEqual(pendientesDeNotas([]), { total: 0, primeros: [] });
  });
  it("la tarjeta se dibuja si hay horario, algo esta semana o pendientes; si no, no", () => {
    assert.equal(hayAlgoQueMostrar({ tipo: "sin-horario" }, [], 0), false);
    assert.equal(hayAlgoQueMostrar({ tipo: "sin-horario" }, [], 2), true);
    assert.equal(hayAlgoQueMostrar({ tipo: "libre", proximoDia: null }, [], 0), true);
  });
});
