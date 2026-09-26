import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOSTS_AVATAR, ID_CANAL, ID_LISTA, ID_VIDEO } from "../src/lib/canales/ids.ts";
import { baseName, extensionOf, formatBytes, safeFileName } from "../src/lib/documents/format.ts";
import { MAX_FILE_BYTES, MAX_FILES_PER_BATCH } from "../src/lib/documents/limits.ts";
import { formatDuration } from "../src/lib/video/format.ts";

describe("formatBytes", () => {
  it("bytes, KB, MB y GB con una cifra decimal cuando hace falta", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(1023), "1023 B");
    assert.equal(formatBytes(1024), "1 KB");
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatBytes(50 * 1024 * 1024), "50 MB");
    assert.equal(formatBytes(1.25 * 1024 * 1024 * 1024), "1.3 GB");
  });
  it("a partir de 100 no lleva decimales", () => {
    assert.equal(formatBytes(150 * 1024), "150 KB");
    assert.equal(formatBytes(200 * 1024 * 1024 + 300_000), "200 MB");
  });
  it("los límites de la aplicación salen como se anuncian", () => {
    assert.equal(formatBytes(MAX_FILE_BYTES), "50 MB");
    assert.equal(MAX_FILES_PER_BATCH, 20);
  });
});

describe("nombres de archivo", () => {
  it("baseName y extensionOf", () => {
    assert.equal(baseName("tarea final.docx"), "tarea final");
    assert.equal(baseName("archivo.tar.gz"), "archivo.tar");
    assert.equal(baseName(".oculto"), ".oculto");
    assert.equal(baseName("sin_extension"), "sin_extension");
    assert.equal(extensionOf("Foto.JPG"), ".jpg");
    assert.equal(extensionOf("sin_extension"), "");
  });
  it("safeFileName quita lo que Windows no permite", () => {
    assert.equal(safeFileName('a<b>c:d"e/f\\g|h?i*j'), "a_b_c_d_e_f_g_h_i_j");
    assert.equal(safeFileName("  espacios  "), "espacios");
    assert.equal(safeFileName("con\u0001control"), "con_control");
  });
  it("un nombre vacío o de puro espacio se llama «documento» y uno larguísimo se recorta", () => {
    assert.equal(safeFileName(""), "documento");
    assert.equal(safeFileName("   "), "documento");
    assert.equal(safeFileName("x".repeat(500)).length, 180);
  });
});

describe("formatDuration", () => {
  it("minutos:segundos y horas:minutos:segundos", () => {
    assert.equal(formatDuration(0), "0:00");
    assert.equal(formatDuration(75), "1:15");
    assert.equal(formatDuration(3599), "59:59");
    assert.equal(formatDuration(3725), "1:02:05");
  });
  it("negativos y fracciones no dan cosas raras", () => {
    assert.equal(formatDuration(-5), "0:00");
    assert.equal(formatDuration(75.9), "1:15");
  });
});

describe("identificadores de YouTube", () => {
  it("canal: «UC» y 22 caracteres", () => {
    assert.ok(ID_CANAL.test("UC" + "a".repeat(22)));
    assert.ok(ID_CANAL.test("UCX6OQ3DkcsbYNE6H8uQQuVA"));
    for (const mal of ["UC123", "XX" + "a".repeat(22), "UC" + "a".repeat(23), "UC" + "a".repeat(21) + "!"]) assert.equal(ID_CANAL.test(mal), false, mal);
  });
  it("video: exactamente 11 caracteres", () => {
    assert.ok(ID_VIDEO.test("dQw4w9WgXcQ"));
    for (const mal of ["corto", "demasiadolargo12", "con espacio!", ""]) assert.equal(ID_VIDEO.test(mal), false, mal);
  });
  it("lista: de 10 a 64 caracteres", () => {
    assert.ok(ID_LISTA.test("PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"));
    assert.equal(ID_LISTA.test("corta"), false);
    assert.equal(ID_LISTA.test("a".repeat(65)), false);
  });
  it("solo se aceptan avatares de los servidores de YouTube, por https", () => {
    assert.ok(HOSTS_AVATAR.test("https://yt3.googleusercontent.com/abc"));
    assert.ok(HOSTS_AVATAR.test("https://i.ytimg.com/vi/x/hq.jpg"));
    for (const mal of ["http://yt3.ggpht.com/a", "https://evil.com/https://yt3.ggpht.com/", "https://yt3.ggpht.com.evil.com/a", "javascript:alert(1)"]) assert.equal(HOSTS_AVATAR.test(mal), false, mal);
  });
});
