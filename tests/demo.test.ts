import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { datosDeDemo, MARCA_DEMO, reiniciarDemo, sembrarDemo } from "../src/lib/demo.ts";

class Almacen {
  datos = new Map<string, string>();
  get length() { return this.datos.size; }
  key(i: number) { return [...this.datos.keys()][i] ?? null; }
  getItem(k: string) { return this.datos.get(k) ?? null; }
  setItem(k: string, v: string) { this.datos.set(k, v); }
  removeItem(k: string) { this.datos.delete(k); }
}

const lunesPorLaManana = new Date(2026, 8, 28, 7, 15); // lunes 28 de septiembre de 2026, 7:15
const aMinutos = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

describe("datosDeDemo", () => {
  it("todo lo que guarda es JSON válido, con horario, eventos y notas", () => {
    const d = datosDeDemo(lunesPorLaManana);
    for (const [clave, valor] of Object.entries(d)) {
      assert.ok(clave.startsWith("nexushub-"), clave);
      if (clave !== "nexushub-tour-visto" && clave !== "nexushub-version-vista") assert.doesNotThrow(() => JSON.parse(valor), clave);
    }
    assert.ok(JSON.parse(d["nexushub-horario"]!).length >= 6);
    assert.equal(JSON.parse(d["nexushub-eventos"]!).length, 5);
    assert.equal(JSON.parse(d["nexushub-notas"]!).length, 3);
  });

  it("hoy hay una clase que empieza en unos 45 minutos (para que «Tu día» tenga cuenta regresiva)", () => {
    const clases = JSON.parse(datosDeDemo(lunesPorLaManana)["nexushub-horario"]!) as { dia: number; inicio: string; fin: string }[];
    const deHoy = clases.filter((c) => c.dia === 0);
    assert.ok(deHoy.some((c) => aMinutos(c.inicio) - (7 * 60 + 15) >= 45 && aMinutos(c.inicio) - (7 * 60 + 15) <= 50));
  });

  it("las clases de un mismo día no se encimen", () => {
    for (const hora of [7, 9, 13, 18]) {
      const clases = JSON.parse(datosDeDemo(new Date(2026, 8, 30, hora, 0))["nexushub-horario"]!) as { dia: number; inicio: string; fin: string }[];
      for (let dia = 0; dia < 7; dia++) {
        const ordenadas = clases.filter((c) => c.dia === dia).sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));
        for (let i = 1; i < ordenadas.length; i++) assert.ok(aMinutos(ordenadas[i]!.inicio) >= aMinutos(ordenadas[i - 1]!.fin), `día ${dia} a las ${hora}`);
      }
    }
  });

  it("de noche no inventa una clase para hoy: deja la de siempre", () => {
    const clases = JSON.parse(datosDeDemo(new Date(2026, 8, 28, 22, 0))["nexushub-horario"]!) as { dia: number; inicio: string }[];
    assert.deepEqual(clases.filter((c) => c.dia === 0).map((c) => c.inicio), ["08:00", "10:00"]);
  });

  it("los eventos son de días que vienen", () => {
    const eventos = JSON.parse(datosDeDemo(lunesPorLaManana)["nexushub-eventos"]!) as { fecha: string }[];
    for (const e of eventos) assert.ok(e.fecha > "2026-09-28", e.fecha);
  });
});

describe("sembrarDemo y reiniciarDemo", () => {
  it("llena solo la primera vez y no pisa lo que la persona cambió", () => {
    const a = new Almacen();
    assert.equal(sembrarDemo(a, lunesPorLaManana), true);
    assert.ok(a.getItem(MARCA_DEMO));
    a.setItem("nexushub-notas", "[]"); // la persona borró sus notas
    assert.equal(sembrarDemo(a, lunesPorLaManana), false);
    assert.equal(a.getItem("nexushub-notas"), "[]");
  });

  it("restablecer borra lo de Nexo y solo lo de Nexo", () => {
    const a = new Almacen();
    sembrarDemo(a, lunesPorLaManana);
    a.setItem("otra-cosa", "x");
    reiniciarDemo(a);
    assert.equal(a.getItem("nexushub-horario"), null);
    assert.equal(a.getItem(MARCA_DEMO), null);
    assert.equal(a.getItem("otra-cosa"), "x");
    assert.equal(sembrarDemo(a, lunesPorLaManana), true); // y vuelve a llenarse
  });

  it("sin almacenamiento no se rompe", () => {
    const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
    assert.equal(sembrarDemo(roto, lunesPorLaManana), false);
  });
});
