import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { desfaseDeSemana, diasDeLaSemana, diasDelMes, ordenDeDias } from "../src/lib/calendario/semana.ts";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("desfaseDeSemana", () => {
  it("con la semana en lunes: lunes 0 … domingo 6", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 0].map((d) => desfaseDeSemana(d, "lunes")), [0, 1, 2, 3, 4, 5, 6]);
  });
  it("con la semana en domingo: domingo 0 … sábado 6", () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((d) => desfaseDeSemana(d, "domingo")), [0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("diasDeLaSemana", () => {
  // 26 de septiembre de 2026 es sábado.
  const sabado = new Date(2026, 8, 26, 15, 45);
  it("de lunes a domingo", () => {
    const d = diasDeLaSemana(sabado, "lunes").map(iso);
    assert.deepEqual(d, ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"]);
  });
  it("de domingo a sábado", () => {
    const d = diasDeLaSemana(sabado, "domingo").map(iso);
    assert.deepEqual(d, ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"]);
  });
  it("un domingo cae al final de su semana de lunes y al principio de la de domingo", () => {
    const domingo = new Date(2026, 8, 27);
    assert.equal(iso(diasDeLaSemana(domingo, "lunes")[6]!), "2026-09-27");
    assert.equal(iso(diasDeLaSemana(domingo, "domingo")[0]!), "2026-09-27");
  });
  it("cruza bien el cambio de mes y de año", () => {
    const d = diasDeLaSemana(new Date(2026, 0, 1), "lunes").map(iso);
    assert.equal(d[0], "2025-12-29");
    assert.equal(d[6], "2026-01-04");
  });
  it("la hora del día no importa y no se modifica la fecha original", () => {
    const f = new Date(2026, 8, 26, 23, 59);
    diasDeLaSemana(f, "lunes");
    assert.equal(f.getHours(), 23);
  });
});

describe("diasDelMes", () => {
  it("siempre 42 días seguidos", () => {
    for (const primer of ["lunes", "domingo"] as const) {
      const d = diasDelMes(2026, 2, primer);
      assert.equal(d.length, 42);
      for (let i = 1; i < d.length; i++) assert.equal((d[i]!.fecha.getTime() - d[i - 1]!.fecha.getTime()) / 86_400_000, 1);
    }
  });
  it("septiembre de 2026 (empieza en martes): en lunes la cuadrícula arranca el 31 de agosto; en domingo, el 30", () => {
    assert.equal(iso(diasDelMes(2026, 9, "lunes")[0]!.fecha), "2026-08-31");
    assert.equal(iso(diasDelMes(2026, 9, "domingo")[0]!.fecha), "2026-08-30");
  });
  it("la primera casilla es del día que se eligió", () => {
    for (let mes = 1; mes <= 12; mes++) {
      assert.equal(diasDelMes(2026, mes, "lunes")[0]!.fecha.getDay(), 1);
      assert.equal(diasDelMes(2026, mes, "domingo")[0]!.fecha.getDay(), 0);
    }
  });
  it("marca cuáles son del mes", () => {
    const d = diasDelMes(2026, 2, "lunes");
    assert.equal(d.filter((x) => x.delMes).length, 28);
    assert.equal(diasDelMes(2028, 2, "lunes").filter((x) => x.delMes).length, 29, "2028 es bisiesto");
  });
});

describe("ordenDeDias", () => {
  it("lunes: L M X J V S D; domingo: D L M X J V S", () => {
    assert.deepEqual(ordenDeDias("lunes"), [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(ordenDeDias("domingo"), [6, 0, 1, 2, 3, 4, 5]);
  });
});
