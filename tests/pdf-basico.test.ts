import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import { dividirPdf, organizarPdf, rotarPdf, unirPdf } from "../src/services/documents/motor/pdf-basico.ts";
import type { Ctx } from "../src/services/documents/motor/comun.ts";

const ctx = (): Ctx => ({ signal: new AbortController().signal, report: () => undefined, warn: () => undefined });

/** Un PDF de mentira con `paginas` páginas; cada página tiene un tamaño distinto (100 + n) para saber cuál es cuál. */
async function pdf(nombre: string, paginas: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let n = 1; n <= paginas; n++) doc.addPage([100 + n, 200]);
  return new File([(await doc.save()) as BlobPart], nombre, { type: "application/pdf" });
}
async function anchos(blob: Blob): Promise<number[]> {
  const doc = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}

describe("unirPdf", () => {
  it("junta los PDF en el orden en que llegan", async () => {
    const [salida] = await unirPdf([await pdf("a.pdf", 2), await pdf("b.pdf", 3)], ctx());
    assert.equal(salida!.name, "a_unido.pdf");
    assert.deepEqual(await anchos(salida!.blob), [101, 102, 101, 102, 103]);
  });
  it("con un solo PDF lo devuelve completo", async () => {
    const [salida] = await unirPdf([await pdf("solo.pdf", 4)], ctx());
    assert.equal((await anchos(salida!.blob)).length, 4);
  });
  it("un archivo que no es PDF da un error entendible", async () => {
    await assert.rejects(async () => unirPdf([await pdf("a.pdf", 1), new File(["hola"], "b.pdf")], ctx()), /no se pudo leer como PDF/);
  });
  it("se puede cancelar", async () => {
    const control = new AbortController();
    control.abort();
    await assert.rejects(async () => unirPdf([await pdf("a.pdf", 1)], { ...ctx(), signal: control.signal }), { name: "AbortError" });
  });
});

describe("dividirPdf", () => {
  it("un solo PDF con las páginas elegidas, en orden", async () => {
    const [s] = await dividirPdf(await pdf("libro.pdf", 6), { ranges: "5, 1-2", mode: "single" }, ctx());
    assert.equal(s!.name, "libro_paginas.pdf");
    assert.deepEqual(await anchos(s!.blob), [101, 102, 105]);
  });
  it("un PDF por rango, con el nombre de las páginas", async () => {
    const salidas = await dividirPdf(await pdf("libro.pdf", 6), { ranges: "1-2, 4", mode: "separate" }, ctx());
    assert.deepEqual(salidas.map((s) => s.name), ["libro_p1-2.pdf", "libro_p4.pdf"]);
    assert.deepEqual(await anchos(salidas[0]!.blob), [101, 102]);
    assert.deepEqual(await anchos(salidas[1]!.blob), [104]);
  });
  it("un rango fuera del documento da un error claro", async () => {
    await assert.rejects(async () => dividirPdf(await pdf("x.pdf", 3), { ranges: "2-9", mode: "single" }, ctx()), /queda fuera del documento/);
  });
  it("un rango mal escrito también", async () => {
    await assert.rejects(async () => dividirPdf(await pdf("x.pdf", 3), { ranges: "uno", mode: "single" }, ctx()), /no es un rango válido/);
  });
});

describe("rotarPdf", () => {
  it("gira solo las páginas pedidas y suma al giro que ya tenían", async () => {
    const [s] = await rotarPdf(await pdf("r.pdf", 3), { rotations: { "2": 90, "3": 270 } }, ctx());
    const doc = await PDFDocument.load(new Uint8Array(await s!.blob.arrayBuffer()));
    assert.deepEqual(doc.getPages().map((p) => p.getRotation().angle), [0, 90, 270]);
    const [otra] = await rotarPdf(new File([(await doc.save()) as BlobPart], "r2.pdf"), { rotations: { "2": 270 } }, ctx());
    const doc2 = await PDFDocument.load(new Uint8Array(await otra!.blob.arrayBuffer()));
    assert.equal(doc2.getPage(1).getRotation().angle, 0); // 90 + 270 = 360 → 0
  });
  it("sin páginas que girar o con una página que no existe, error", async () => {
    await assert.rejects(async () => rotarPdf(await pdf("r.pdf", 2), { rotations: {} }, ctx()), /No hay ninguna página para girar/);
    await assert.rejects(async () => rotarPdf(await pdf("r.pdf", 2), { rotations: { "5": 90 } }, ctx()), /no existe en el documento/);
  });
});

describe("organizarPdf", () => {
  it("deja las páginas en el orden dado y quita las que no aparecen", async () => {
    const [s] = await organizarPdf(await pdf("o.pdf", 4), [3, 1], ctx());
    assert.equal(s!.name, "o_organizado.pdf");
    assert.deepEqual(await anchos(s!.blob), [103, 101]);
  });
  it("puede repetir una página", async () => {
    const [s] = await organizarPdf(await pdf("o.pdf", 2), [2, 2, 1], ctx());
    assert.deepEqual(await anchos(s!.blob), [102, 102, 101]);
  });
  it("sin páginas o con páginas que no existen, error", async () => {
    await assert.rejects(async () => organizarPdf(await pdf("o.pdf", 2), [], ctx()), /No queda ninguna página/);
    await assert.rejects(async () => organizarPdf(await pdf("o.pdf", 2), [3], ctx()), /no coincide con el documento/);
    await assert.rejects(async () => organizarPdf(await pdf("o.pdf", 2), [1.5], ctx()), /no coincide con el documento/);
  });
});
