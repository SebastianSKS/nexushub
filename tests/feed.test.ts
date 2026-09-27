import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsearFeed, urlFeed } from "../src/services/canales/feed.ts";

const atom = (entradas: string, titulo = "Canal de prueba") => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>${titulo}</title>${entradas}
</feed>`;
const entrada = (id: string, titulo: string, canal = "UCX6OQ3DkcsbYNE6H8uQQuVA") => `
  <entry>
    <yt:videoId>${id}</yt:videoId>
    <yt:channelId>${canal}</yt:channelId>
    <title>${titulo}</title>
    <author><name>Autor</name></author>
    <published>2026-09-20T10:00:00+00:00</published>
  </entry>`;

describe("urlFeed", () => {
  it("canal y lista de reproducción", () => {
    assert.equal(urlFeed("UCabc", "canal"), "https://www.youtube.com/feeds/videos.xml?channel_id=UCabc");
    assert.equal(urlFeed("PLxyz", "lista"), "https://www.youtube.com/feeds/videos.xml?playlist_id=PLxyz");
  });
});

describe("parsearFeed", () => {
  it("saca el nombre del canal y sus videos, con miniatura", async () => {
    const r = await parsearFeed(atom(entrada("dQw4w9WgXcQ", "Primer video") + entrada("abcdefghijk", "Segundo")));
    assert.equal(r.nombre, "Canal de prueba");
    assert.equal(r.videos.length, 2);
    assert.deepEqual(
      [r.videos[0]!.videoId, r.videos[0]!.titulo, r.videos[0]!.canalNombre, r.videos[0]!.publicado],
      ["dQw4w9WgXcQ", "Primer video", "Autor", "2026-09-20T10:00:00+00:00"],
    );
    assert.equal(r.videos[0]!.miniatura, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("un feed con un solo video (que el XML da como objeto y no como lista) también funciona", async () => {
    const r = await parsearFeed(atom(entrada("dQw4w9WgXcQ", "Único")));
    assert.equal(r.videos.length, 1);
  });

  it("un título que es un número sigue siendo texto", async () => {
    const r = await parsearFeed(atom(entrada("dQw4w9WgXcQ", "2024")));
    assert.equal(r.videos[0]!.titulo, "2024");
  });

  it("ignora entradas con un identificador de video que no es válido", async () => {
    const r = await parsearFeed(atom(entrada("corto", "Malo") + entrada("dQw4w9WgXcQ", "Bueno")));
    assert.deepEqual(r.videos.map((v) => v.titulo), ["Bueno"]);
  });

  it("un feed vacío da cero videos", async () => {
    const r = await parsearFeed(atom(""));
    assert.deepEqual(r.videos, []);
  });

  it("lo que no es un feed de YouTube lanza un error claro", async () => {
    await assert.rejects(() => parsearFeed("<html><body>hola</body></html>"), /feed que no se pudo leer/);
  });
});
