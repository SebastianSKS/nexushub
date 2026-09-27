import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import type { Ctx } from "../src/services/documents/motor/comun.ts";
import { numerarPaginas, ponerMarcaDeAgua } from "../src/services/documents/motor/pdf-marcas.ts";
import type { PageNumbersOptions, WatermarkOptions } from "../src/types/documents.ts";

const ctx = (): Ctx => ({ signal: new AbortController().signal, report: () => undefined, warn: () => undefined });

async function pdf(nombre: string, paginas: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let n = 0; n < paginas; n++) doc.addPage([400, 600]);
  return new File([(await doc.save()) as BlobPart], nombre, { type: "application/pdf" });
}
const abrir = async (blob: Blob) => PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
/** ¿La página tiene algo dibujado? (una página en blanco no tiene contenido). */
const conContenido = (doc: PDFDocument) => doc.getPages().map((p) => p.node.Contents() !== undefined);

const marca: WatermarkOptions = { text: "BORRADOR", opacity: 40, layout: "diagonal", size: "medium", color: "gray" };
const numeros: PageNumbersOptions = { position: "bottom-center", format: "n", start: 1, skipFirst: false };

describe("ponerMarcaDeAgua", () => {
  it("dibuja la marca en todas las páginas y conserva el número de páginas", async () => {
    const [s] = await ponerMarcaDeAgua([await pdf("a.pdf", 3)], marca, ctx());
    assert.equal(s!.name, "a_marca.pdf");
    const doc = await abrir(s!.blob);
    assert.equal(doc.getPageCount(), 3);
    assert.deepEqual(conContenido(doc), [true, true, true]);
  });
  it("funciona con varios archivos a la vez, uno por uno", async () => {
    const salidas = await ponerMarcaDeAgua([await pdf("a.pdf", 1), await pdf("b.pdf", 2)], { ...marca, layout: "horizontal", color: "red", size: "large" }, ctx());
    assert.deepEqual(salidas.map((s) => s.name), ["a_marca.pdf", "b_marca.pdf"]);
  });
  it("sin texto es un error, y un texto que el PDF no puede dibujar (emojis) también", async () => {
    await assert.rejects(async () => ponerMarcaDeAgua([await pdf("a.pdf", 1)], { ...marca, text: "   " }, ctx()), /Escribe el texto/);
    await assert.rejects(async () => ponerMarcaDeAgua([await pdf("a.pdf", 1)], { ...marca, text: "Listo ✅" }, ctx()), /no puede dibujar/);
  });
  it("acepta acentos y ñ", async () => {
    const [s] = await ponerMarcaDeAgua([await pdf("a.pdf", 1)], { ...marca, text: "CONFIDENCIAL – Año 2026" }, ctx());
    assert.equal((await abrir(s!.blob)).getPageCount(), 1);
  });
});

describe("numerarPaginas", () => {
  it("numera todas las páginas", async () => {
    const [s] = await numerarPaginas([await pdf("l.pdf", 3)], numeros, ctx());
    assert.equal(s!.name, "l_numerado.pdf");
    assert.deepEqual(conContenido(await abrir(s!.blob)), [true, true, true]);
  });
  it("puede dejar la primera página (la portada) sin número", async () => {
    const [s] = await numerarPaginas([await pdf("l.pdf", 3)], { ...numeros, skipFirst: true }, ctx());
    assert.deepEqual(conContenido(await abrir(s!.blob)), [false, true, true]);
  });
  it("todas las posiciones y formatos funcionan", async () => {
    for (const position of ["bottom-center", "bottom-right", "bottom-left", "top-center", "top-right", "top-left"] as const) {
      for (const format of ["n", "of-total", "page"] as const) {
        const [s] = await numerarPaginas([await pdf("p.pdf", 2)], { ...numeros, position, format }, ctx());
        assert.equal((await abrir(s!.blob)).getPageCount(), 2, `${position}/${format}`);
      }
    }
  });
  it("un número inicial fuera de rango o inválido no rompe nada", async () => {
    for (const start of [Number.NaN, -5, 1e9, 3.7]) {
      const [s] = await numerarPaginas([await pdf("p.pdf", 1)], { ...numeros, start }, ctx());
      assert.equal((await abrir(s!.blob)).getPageCount(), 1);
    }
  });
});
