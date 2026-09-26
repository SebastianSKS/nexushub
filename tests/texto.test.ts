import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalize, plegar } from "../src/lib/text.ts";

describe("texto", () => {
  it("normalize quita acentos y mayúsculas", () => {
    assert.equal(normalize("Música ÁÉÍÓÚ Ñandú"), "musica aeiou nandu");
  });

  it("plegar hace lo mismo pero conserva el largo exacto (para marcar fragmentos)", () => {
    for (const texto of ["Fotosíntesis y célula", "AÑO Ü ç", "sin acentos", "İstanbul"]) {
      assert.equal(plegar(texto).length, texto.length, texto);
    }
    assert.equal(plegar("Fotosíntesis"), "fotosintesis");
    assert.equal(plegar("AÑO"), "ano");
  });
});
