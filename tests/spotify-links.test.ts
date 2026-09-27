import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSpotifyLink } from "../src/services/music/links.ts";

const ID = "4uLU6hMCjMI75M1A2tKUQC"; // 22 caracteres, como los de Spotify

describe("parseSpotifyLink", () => {
  it("reconoce enlaces de canción, álbum, lista y artista", () => {
    for (const tipo of ["track", "album", "playlist", "artist"] as const) {
      assert.deepEqual(parseSpotifyLink(`https://open.spotify.com/${tipo}/${ID}`), { kind: tipo, id: ID });
    }
  });
  it("reconoce enlaces con idioma y con parámetros de seguimiento", () => {
    assert.deepEqual(parseSpotifyLink(`https://open.spotify.com/intl-es/track/${ID}?si=abc123`), { kind: "track", id: ID });
    assert.deepEqual(parseSpotifyLink(`  https://open.spotify.com/track/${ID}  `), { kind: "track", id: ID });
  });
  it("reconoce las URI «spotify:tipo:id»", () => {
    assert.deepEqual(parseSpotifyLink(`spotify:album:${ID}`), { kind: "album", id: ID });
  });
  it("una búsqueda normal no es un enlace", () => {
    for (const texto of ["", "bohemian rhapsody", "https://youtube.com/watch?v=abc", `spotify:user:${ID}`, "spotify:track:corto", `https://open.spotify.com/show/${ID}`]) {
      assert.equal(parseSpotifyLink(texto), null, texto);
    }
  });
});
