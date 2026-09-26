import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { duracionDe, esSonidoAviso, esSonidoNexo, esSonidoWindows, SONIDO_PREDETERMINADO, SONIDOS_NEXO, SONIDOS_NEXO_IDS, SONIDOS_WINDOWS_IDS, volumenAGanancia } from "../src/lib/sonidos.ts";

describe("partituras de Nexo", () => {
  it("cada sonido tiene notas audibles, con volumen razonable", () => {
    for (const id of SONIDOS_NEXO_IDS) {
      const notas = SONIDOS_NEXO[id];
      assert.ok(notas.length > 0, `${id} no tiene notas`);
      for (const n of notas) {
        assert.ok(n.frecuencia >= 200 && n.frecuencia <= 4000, `${id}: frecuencia ${n.frecuencia} fuera de lo agradable`);
        assert.ok(n.duracion > 0.05 && n.duracion <= 1.5, `${id}: duración ${n.duracion}`);
        assert.ok(n.inicio >= 0 && n.inicio < 1, `${id}: inicio ${n.inicio}`);
        assert.ok(n.volumen > 0 && n.volumen <= 0.6, `${id}: volumen ${n.volumen} (muy alto para un aviso)`);
      }
    }
  });

  it("ningún sonido dura más de un segundo y medio (es un aviso, no una canción)", () => {
    for (const id of SONIDOS_NEXO_IDS) assert.ok(duracionDe(id) <= 1.5, `${id} dura ${duracionDe(id)} s`);
  });

  it("las notas que suenan a la vez no suman más de 1 (no satura)", () => {
    for (const id of SONIDOS_NEXO_IDS) {
      const notas = SONIDOS_NEXO[id];
      for (const a of notas) {
        const juntas = notas.filter((b) => b.inicio <= a.inicio && b.inicio + b.duracion > a.inicio).reduce((s, b) => s + b.volumen, 0);
        assert.ok(juntas <= 1, `${id}: ${juntas} de volumen a la vez`);
      }
    }
  });
});

describe("volumenAGanancia", () => {
  it("es 0 en 0, 1 en 100 y crece siempre", () => {
    assert.equal(volumenAGanancia(0), 0);
    assert.equal(volumenAGanancia(100), 1);
    let antes = -1;
    for (let v = 0; v <= 100; v += 5) {
      const g = volumenAGanancia(v);
      assert.ok(g > antes || v === 0);
      antes = g;
    }
  });
  it("no se sale de rango con valores raros", () => {
    assert.equal(volumenAGanancia(-20), 0);
    assert.equal(volumenAGanancia(500), 1);
    assert.equal(volumenAGanancia(Number.NaN), 0);
  });
});

describe("elección de sonido", () => {
  it("reconoce los de Nexo, los de Windows y «ninguno»", () => {
    assert.ok(esSonidoNexo("nexo-gota") && !esSonidoNexo("windows"));
    assert.ok(esSonidoWindows("windows-correo") && !esSonidoWindows("nexo-gota"));
    for (const s of [...SONIDOS_NEXO_IDS, ...SONIDOS_WINDOWS_IDS, "ninguno"]) assert.ok(esSonidoAviso(s), s);
  });
  it("rechaza lo demás", () => {
    for (const s of ["", "campana", 3, null, undefined, "nexo-otro"]) assert.equal(esSonidoAviso(s), false);
  });
  it("el sonido por defecto es válido", () => {
    assert.ok(esSonidoAviso(SONIDO_PREDETERMINADO));
  });
});
