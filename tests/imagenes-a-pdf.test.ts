import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deflateSync, crc32 } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import type { Ctx } from "../src/services/documents/motor/comun.ts";
import { imagenesAPdf, leerOrientacionJpeg } from "../src/services/documents/motor/imagenes-a-pdf.ts";

const ctx = (): Ctx => ({ signal: new AbortController().signal, report: () => undefined, warn: () => undefined });

/** Un PNG de verdad (blanco, RGB) del tamaño pedido, armado a mano: firma, IHDR, IDAT, IEND. */
function png(w: number, h: number): Uint8Array {
  const trozo = (tipo: string, datos: Uint8Array) => {
    const salida = new Uint8Array(12 + datos.length);
    const v = new DataView(salida.buffer);
    v.setUint32(0, datos.length);
    salida.set(new TextEncoder().encode(tipo), 4);
    salida.set(datos, 8);
    v.setUint32(8 + datos.length, crc32(salida.subarray(4, 8 + datos.length)));
    return salida;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, w);
  v.setUint32(4, h);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  const fila = new Uint8Array(1 + w * 3).fill(255);
  fila[0] = 0;
  const crudo = new Uint8Array(fila.length * h);
  for (let y = 0; y < h; y++) crudo.set(fila, y * fila.length);
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), trozo("IHDR", ihdr), trozo("IDAT", new Uint8Array(deflateSync(crudo))), trozo("IEND", new Uint8Array())];
  const total = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of partes) (total.set(p, o), (o += p.length));
  return total;
}
const archivoPng = (nombre: string, w: number, h: number) => new File([png(w, h) as BlobPart], nombre, { type: "image/png" });
const paginas = async (blob: Blob) => (await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()))).getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);

/** Un JPEG «vacío» que solo lleva la etiqueta EXIF de orientación (lo justo para probar el lector). */
function jpegConExif(orientacion: number, little: boolean): Uint8Array {
  const tiff = new Uint8Array(8 + 2 + 12 + 4);
  const t = new DataView(tiff.buffer);
  t.setUint16(0, little ? 0x4949 : 0x4d4d);
  t.setUint16(2, 42, little);
  t.setUint32(4, 8, little);
  t.setUint16(8, 1, little); // una entrada
  t.setUint16(10, 0x0112, little);
  t.setUint16(12, 3, little);
  t.setUint32(14, 1, little);
  t.setUint16(18, orientacion, little);
  const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]);
  const app1 = new Uint8Array(4 + exif.length);
  new DataView(app1.buffer).setUint16(0, 0xffe1);
  new DataView(app1.buffer).setUint16(2, exif.length + 2);
  app1.set(exif, 4);
  return new Uint8Array([0xff, 0xd8, ...app1, 0xff, 0xda, 0, 2]);
}

describe("leerOrientacionJpeg", () => {
  it("lee la orientación en las dos formas de guardar los números (little y big endian)", () => {
    for (const o of [1, 3, 6, 8]) {
      assert.equal(leerOrientacionJpeg(jpegConExif(o, true)), o, `little ${o}`);
      assert.equal(leerOrientacionJpeg(jpegConExif(o, false)), o, `big ${o}`);
    }
  });
  it("una orientación imposible cuenta como 1 (sin giro)", () => {
    assert.equal(leerOrientacionJpeg(jpegConExif(0, true)), 1);
    assert.equal(leerOrientacionJpeg(jpegConExif(9, false)), 1);
  });
  it("lo que no es un JPEG, o no tiene EXIF, o está cortado, cuenta como 1", () => {
    assert.equal(leerOrientacionJpeg(new Uint8Array()), 1);
    assert.equal(leerOrientacionJpeg(new Uint8Array([1, 2, 3, 4, 5, 6])), 1);
    assert.equal(leerOrientacionJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2])), 1);
    assert.equal(leerOrientacionJpeg(jpegConExif(6, true).subarray(0, 14)), 1);
  });
});

describe("imagenesAPdf", () => {
  const base = { pageSize: "a4", orientation: "auto", margin: "none" } as const;

  it("una imagen da un PDF con su nombre", async () => {
    const [s] = await imagenesAPdf([archivoPng("foto.png", 40, 20)], base, ctx());
    assert.equal(s!.name, "foto.pdf");
    assert.equal((await paginas(s!.blob)).length, 1);
  });
  it("varias imágenes dan un solo PDF con una página por imagen", async () => {
    const [s] = await imagenesAPdf([archivoPng("a.png", 10, 10), archivoPng("b.png", 10, 10), archivoPng("c.png", 10, 10)], base, ctx());
    assert.equal(s!.name, "imagenes.pdf");
    assert.equal((await paginas(s!.blob)).length, 3);
  });
  it("hoja A4: vertical para una imagen alta y horizontal para una ancha (orientación automática)", async () => {
    const [s] = await imagenesAPdf([archivoPng("alta.png", 10, 30), archivoPng("ancha.png", 30, 10)], base, ctx());
    assert.deepEqual(await paginas(s!.blob), [[595, 842], [842, 595]]);
  });
  it("la orientación se puede forzar", async () => {
    const [s] = await imagenesAPdf([archivoPng("alta.png", 10, 30)], { ...base, orientation: "landscape" }, ctx());
    assert.deepEqual(await paginas(s!.blob), [[842, 595]]);
  });
  it("hoja Carta", async () => {
    const [s] = await imagenesAPdf([archivoPng("a.png", 10, 30)], { ...base, pageSize: "letter" }, ctx());
    assert.deepEqual(await paginas(s!.blob), [[612, 792]]);
  });
  it("«ajustar»: la página mide lo mismo que la imagen más los márgenes", async () => {
    const [sin] = await imagenesAPdf([archivoPng("a.png", 100, 50)], { ...base, pageSize: "fit" }, ctx());
    const [con] = await imagenesAPdf([archivoPng("a.png", 100, 50)], { ...base, pageSize: "fit", margin: "large" }, ctx());
    assert.deepEqual(await paginas(sin!.blob), [[100, 50]]);
    assert.deepEqual(await paginas(con!.blob), [[196, 146]]);
  });
  it("una imagen dañada da un error entendible", async () => {
    await assert.rejects(async () => imagenesAPdf([new File(["no soy una imagen"], "rota.png")], base, ctx()), /No se pudo leer la imagen «rota.png»/);
    await assert.rejects(async () => imagenesAPdf([archivoPng("engaño.jpg", 5, 5)], base, ctx()), /No se pudo leer la imagen/); // PNG con nombre .jpg
  });
  it("se puede cancelar", async () => {
    const control = new AbortController();
    control.abort();
    await assert.rejects(async () => imagenesAPdf([archivoPng("a.png", 5, 5)], base, { ...ctx(), signal: control.signal }), { name: "AbortError" });
  });
});
