import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planDeAviso, type AjustesDeAviso } from "../src/lib/plan-aviso.ts";

const base: AjustesDeAviso = { sonidoAvisos: "nexo-campana", silencioActivo: false, silencioDesde: 22, silencioHasta: 7 };
const a = (h: number) => new Date(2026, 8, 26, h);

describe("planDeAviso", () => {
  it("con un sonido de Nexo: el aviso de Windows va en silencio y Nexo toca el suyo", () => {
    const p = planDeAviso(base, a(12));
    assert.deepEqual(p, { enviar: true, sonidoDelAviso: "silencio", tocarNexo: "nexo-campana", conSonidoDeWindows: false });
  });

  it("con un sonido de Windows: lo pone el aviso y Nexo no toca nada", () => {
    const p = planDeAviso({ ...base, sonidoAvisos: "windows-recordatorio" }, a(12));
    assert.deepEqual(p, { enviar: true, sonidoDelAviso: "windows-recordatorio", tocarNexo: null, conSonidoDeWindows: true });
  });

  it("sin sonido: ni Windows ni Nexo", () => {
    const p = planDeAviso({ ...base, sonidoAvisos: "ninguno" }, a(12));
    assert.deepEqual(p, { enviar: true, sonidoDelAviso: "silencio", tocarNexo: null, conSonidoDeWindows: false });
  });

  it("en horas de «No molestar» no se envía nada", () => {
    const c = { ...base, silencioActivo: true };
    assert.equal(planDeAviso(c, a(23)).enviar, false);
    assert.equal(planDeAviso(c, a(3)).enviar, false);
    assert.equal(planDeAviso(c, a(12)).enviar, true);
  });

  it("«No molestar» apagado no calla aunque sea de noche", () => {
    assert.equal(planDeAviso({ ...base, silencioActivo: false }, a(23)).enviar, true);
  });

  it("el aviso de prueba ignora el silencio y puede usar otro sonido", () => {
    const c = { ...base, silencioActivo: true };
    const p = planDeAviso(c, a(23), { ignorarSilencio: true, sonido: "nexo-gota" });
    assert.equal(p.enviar, true);
    assert.equal(p.tocarNexo, "nexo-gota");
  });
});
