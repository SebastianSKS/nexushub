import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compararVersiones, NOVEDADES, novedadesEntre } from "../src/lib/novedades.ts";

describe("novedades", () => {
  it("compara versiones número a número", () => {
    assert.ok(compararVersiones("0.1.3", "0.1.2") > 0);
    assert.ok(compararVersiones("0.1.10", "0.1.9") > 0, "0.1.10 es más nueva que 0.1.9");
    assert.ok(compararVersiones("0.2.0", "0.1.99") > 0);
    assert.equal(compararVersiones("1.0", "1.0.0"), 0);
    assert.ok(compararVersiones("0.1.0", "0.1.1") < 0);
  });

  it("da lo posterior a la versión que se tenía, hasta la actual, de la más nueva a la más vieja", () => {
    assert.deepEqual(
      novedadesEntre("0.1.0", "0.1.3").map((n) => n.version),
      ["0.1.3", "0.1.2", "0.1.1"],
    );
    assert.deepEqual(
      novedadesEntre("0.1.2", "0.1.3").map((n) => n.version),
      ["0.1.3"],
    );
    assert.deepEqual(novedadesEntre("0.1.3", "0.1.3"), []);
  });

  it("las versiones están ordenadas y cada una cuenta algo", () => {
    for (let i = 1; i < NOVEDADES.length; i++) assert.ok(compararVersiones(NOVEDADES[i - 1]!.version, NOVEDADES[i]!.version) > 0, "de más nueva a más vieja");
    for (const v of NOVEDADES) assert.ok(v.novedades.length > 0, `la ${v.version} no cuenta nada`);
  });
});
