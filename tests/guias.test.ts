import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GUIAS, guiaDeRuta } from "../src/lib/guias.ts";

describe("guías", () => {
  it("cada pantalla lleva a su guía", () => {
    assert.equal(guiaDeRuta("/"), "bienvenida");
    assert.equal(guiaDeRuta("/inicio"), "bienvenida");
    assert.equal(guiaDeRuta("/video"), "video");
    assert.equal(guiaDeRuta("/video/ver"), "video");
    assert.equal(guiaDeRuta("/musica/artista"), "musica");
    assert.equal(guiaDeRuta("/documentos"), "documentos");
    assert.equal(guiaDeRuta("/documentos/carpetas"), "carpetas");
    assert.equal(guiaDeRuta("/documentos/unir-pdf"), "herramienta");
    assert.equal(guiaDeRuta("/calendario/"), "calendario");
    assert.equal(guiaDeRuta("/horario"), "horario");
    assert.equal(guiaDeRuta("/calculadora"), "calculadora");
    assert.equal(guiaDeRuta("/configuracion"), "configuracion");
    assert.equal(guiaDeRuta("/atajos"), "atajos");
  });

  it("las pantallas técnicas no tienen guía", () => {
    assert.equal(guiaDeRuta("/api/spotify/callback"), null);
    assert.equal(guiaDeRuta("/no-existe"), null);
  });

  it("toda guía tiene pasos completos y su id coincide con su llave", () => {
    for (const [id, guia] of Object.entries(GUIAS)) {
      assert.equal(guia.id, id);
      assert.ok(guia.pasos.length > 0, `${id} sin pasos`);
      for (const p of guia.pasos) {
        assert.ok(p.titulo.trim() && p.texto.trim(), `${id} tiene un paso vacío`);
      }
    }
  });
});
