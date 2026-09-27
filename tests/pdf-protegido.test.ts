import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import type { Ctx } from "../src/services/documents/motor/comun.ts";
import { protegerPdf } from "../src/services/documents/motor/pdf-protegido.ts";

const ctx = (): Ctx => ({ signal: new AbortController().signal, report: () => undefined, warn: () => undefined });

async function pdf(nombre: string, paginas: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let n = 1; n <= paginas; n++) doc.addPage([300 + n, 400]).drawText(`Hola ${n}`, { x: 20, y: 200, size: 18 });
  doc.setTitle("Título de prueba");
  return new File([(await doc.save()) as BlobPart], nombre, { type: "application/pdf" });
}

/** Abre el resultado con pdf.js (una implementación independiente): es la prueba real de que el cifrado es correcto. */
async function abrirConPdfjs(blob: Blob, password?: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const tarea = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), password, verbosity: 0 });
  try {
    const doc = await tarea.promise;
    const paginas = doc.numPages;
    const texto = (await (await doc.getPage(1)).getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join("");
    return { paginas, texto };
  } finally {
    await tarea.destroy();
  }
}

describe("protegerPdf", () => {
  it("el archivo queda cifrado: se abre con la contraseña y trae el mismo contenido", async () => {
    const [s] = await protegerPdf([await pdf("a.pdf", 2)], "secreto", ctx());
    assert.equal(s!.name, "a_protegido.pdf");
    const abierto = await abrirConPdfjs(s!.blob, "secreto");
    assert.equal(abierto.paginas, 2);
    assert.match(abierto.texto, /Hola 1/);
  });
  it("sin contraseña o con una equivocada, pdf.js no lo abre", async () => {
    const [s] = await protegerPdf([await pdf("a.pdf", 1)], "secreto", ctx());
    await assert.rejects(() => abrirConPdfjs(s!.blob), /password/i);
    await assert.rejects(() => abrirConPdfjs(s!.blob, "otra"), /password/i);
  });
  it("funciona con contraseñas con acentos y con varios archivos", async () => {
    const salidas = await protegerPdf([await pdf("a.pdf", 1), await pdf("b.pdf", 3)], "contraseña-ñ", ctx());
    assert.deepEqual(salidas.map((x) => x.name), ["a_protegido.pdf", "b_protegido.pdf"]);
    assert.equal((await abrirConPdfjs(salidas[1]!.blob, "contraseña-ñ")).paginas, 3);
  });
  it("una contraseña vacía es un error", async () => {
    await assert.rejects(async () => protegerPdf([await pdf("a.pdf", 1)], "   ", ctx()), /Escribe una contraseña/);
  });
  it("pdf-lib lo reconoce como cifrado", async () => {
    const [s] = await protegerPdf([await pdf("a.pdf", 1)], "x1", ctx());
    const bytes = new Uint8Array(await s!.blob.arrayBuffer());
    await assert.rejects(() => PDFDocument.load(bytes), /encrypt/i);
  });
});
