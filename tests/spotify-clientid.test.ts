import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esClientIdValido, obtenerClientId, clienteIdConfigurado } from "../src/services/music/oauth.ts";

describe("Client ID de Spotify", () => {
  it("acepta 32 caracteres hexadecimales (con o sin espacios alrededor, en mayúsculas o minúsculas)", () => {
    assert.equal(esClientIdValido("44823508c86a453faf53f287233b7016"), true);
    assert.equal(esClientIdValido("  44823508C86A453FAF53F287233B7016\n"), true);
  });

  it("rechaza lo que no tiene la forma de uno", () => {
    for (const malo of ["", "abc", "44823508c86a453faf53f287233b701", "44823508c86a453faf53f287233b70160", "44823508c86a453faf53f287233b701g", "http://127.0.0.1:3000"]) {
      assert.equal(esClientIdValido(malo), false, malo);
    }
  });

  it("Conectar con Spotify funciona de entrada: hay un Client ID aunque no se configure nada", () => {
    assert.equal(clienteIdConfigurado(), true);
    assert.equal(esClientIdValido(obtenerClientId()), true);
  });
});
