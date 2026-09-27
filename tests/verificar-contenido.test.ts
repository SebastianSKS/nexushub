import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import { crearArchivoNuevo } from "../src/services/documents/nuevos.ts";
import { verificarContenido } from "../src/services/documents/motor/verificar.ts";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

describe("verificarContenido", () => {
  it("acepta un archivo que es lo que dice ser (por su contenido)", async () => {
    const pdf = new File([(await (await PDFDocument.create()).save()) as BlobPart], "a.pdf");
    await verificarContenido(pdf, "pdf");
    await verificarContenido(new File([png as BlobPart], "foto.png"), "image");
    await verificarContenido(new File([jpeg as BlobPart], "foto.jpg"), "image");
    await verificarContenido(await crearArchivoNuevo("word", "Trabajo"), "word");
    await verificarContenido(await crearArchivoNuevo("excel", "Datos"), "excel");
    await verificarContenido(await crearArchivoNuevo("powerpoint", "Expo"), "powerpoint");
  });
  it("rechaza un archivo cuyo contenido no coincide con lo esperado, aunque tenga la extensión buena", async () => {
    await assert.rejects(() => verificarContenido(new File(["texto normal"], "falso.pdf"), "pdf"), /no es realmente un PDF/);
    await assert.rejects(() => verificarContenido(new File([png as BlobPart], "foto.pdf"), "pdf"), /no es realmente un PDF/);
  });
  it("un Word no se acepta como Excel, ni al revés", async () => {
    await assert.rejects(async () => verificarContenido(await crearArchivoNuevo("word", "Trabajo"), "excel"), /no es realmente un libro de Excel/);
    await assert.rejects(async () => verificarContenido(await crearArchivoNuevo("excel", "Datos"), "word"), /no es realmente un documento de Word/);
  });
  it("un archivo vacío no es nada", async () => {
    await assert.rejects(() => verificarContenido(new File([], "vacio.docx"), "word"), /no es realmente/);
  });
  it("un .doc antiguo (contenedor CFB) solo vale si se declaró como .doc", async () => {
    const cfb = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Array(600).fill(0)]);
    await assert.rejects(() => verificarContenido(new File([cfb as BlobPart], "hoja.xls"), "word"), /no es realmente/);
  });
});
