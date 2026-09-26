import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventosPorAvisarDeHora, minutosDeHoraTexto, type EventoConHora } from "../src/lib/calendario/avisos-hora.ts";

const ev = (p: Partial<EventoConHora> = {}): EventoConHora => ({ id: "e1", titulo: "Examen de física", fecha: "2026-09-26", hora: "08:30", repetir: "no", avisar: true, ...p });
const a = (h: number, m = 0, dia = 26) => new Date(2026, 8, dia, h, m);

describe("minutosDeHoraTexto", () => {
  it("convierte horas válidas y devuelve null con lo demás", () => {
    assert.equal(minutosDeHoraTexto("08:30"), 510);
    assert.equal(minutosDeHoraTexto("0:05"), 5);
    assert.equal(minutosDeHoraTexto("23:59"), 1439);
    for (const mal of [null, "", "24:00", "8:5", "hola"]) assert.equal(minutosDeHoraTexto(mal), null, String(mal));
  });
});

describe("eventosPorAvisarDeHora", () => {
  it("avisa cuando falta menos que el margen (y más de 0)", () => {
    const r = eventosPorAvisarDeHora([ev()], a(8, 0), 30);
    assert.equal(r.length, 1);
    assert.equal(r[0]!.faltan, 30);
    assert.match(r[0]!.clave, /^evento-hora:e1\|2026-09-26\|08:30$/);
  });

  it("todavía falta mucho: no avisa", () => {
    assert.equal(eventosPorAvisarDeHora([ev()], a(7, 59), 30).length, 0);
  });

  it("ya empezó (o empieza justo ahora): no avisa", () => {
    assert.equal(eventosPorAvisarDeHora([ev()], a(8, 30), 30).length, 0);
    assert.equal(eventosPorAvisarDeHora([ev()], a(9, 0), 30).length, 0);
  });

  it("el último minuto sí cuenta", () => {
    assert.equal(eventosPorAvisarDeHora([ev()], a(8, 29), 30)[0]!.faltan, 1);
  });

  it("margen 0 = apagado", () => {
    assert.equal(eventosPorAvisarDeHora([ev()], a(8, 20), 0).length, 0);
  });

  it("los eventos de todo el día, los de otro día y los sin aviso no cuentan", () => {
    assert.equal(eventosPorAvisarDeHora([ev({ hora: null })], a(8, 0), 60).length, 0);
    assert.equal(eventosPorAvisarDeHora([ev({ fecha: "2026-09-27" })], a(8, 0), 60).length, 0);
    assert.equal(eventosPorAvisarDeHora([ev({ avisar: false })], a(8, 0), 60).length, 0);
  });

  it("los que se repiten avisan cada vez, con una clave distinta por día", () => {
    const e = ev({ fecha: "2026-09-01", repetir: "semanal" });
    const hoy = eventosPorAvisarDeHora([e], a(8, 10, 29), 30);
    const otroDia = eventosPorAvisarDeHora([e], a(8, 10, 22), 30);
    assert.equal(hoy.length, 1);
    assert.equal(otroDia.length, 1);
    assert.notEqual(hoy[0]!.clave, otroDia[0]!.clave);
  });

  it("varios eventos: salen ordenados por lo que falta", () => {
    const r = eventosPorAvisarDeHora([ev({ id: "b", hora: "09:00" }), ev({ id: "a", hora: "08:40" })], a(8, 30), 60);
    assert.deepEqual(r.map((x) => x.evento.id), ["a", "b"]);
  });

  it("no cambia la lista original", () => {
    const lista = [ev({ id: "b", hora: "09:00" }), ev({ id: "a", hora: "08:40" })];
    eventosPorAvisarDeHora(lista, a(8, 30), 60);
    assert.deepEqual(lista.map((x) => x.id), ["b", "a"]);
  });
});
