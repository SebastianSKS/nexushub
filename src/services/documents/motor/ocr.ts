import { PDFDocument } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import type { OcrOptions } from "@/types/documents";
import { DocumentError } from "../errors";
import { openPdf } from "../pdfjs";
import { abortarSiCancelado, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";

/**
 * OCR (reconocer texto) con Tesseract, todo en el equipo: el motor y el idioma español salen de la propia aplicación.
 * Sirve para PDF escaneados y fotos. Cada página se dibuja a buena resolución y se lee; el resultado es un PDF con el
 * texto encima (seleccionable y buscable) o un .txt.
 */

const LADO_MAXIMO = 2600; // lado mayor de la imagen que se lee: más no mejora la lectura y tarda mucho más
const MAX_PAGINAS = 60;

type Trabajador = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;

async function crearTrabajador(): Promise<Trabajador> {
  const { createWorker } = await import("tesseract.js");
  return createWorker("spa", 1, { workerPath: "/tesseract/worker.min.js", corePath: "/tesseract/core", langPath: "/tesseract/lang", gzip: true });
}

function lienzo(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Las páginas de un archivo, como imágenes listas para leer. */
async function* paginasDe(archivo: File, ctx: Ctx): AsyncGenerator<{ lienzo: HTMLCanvasElement; n: number; total: number; ancho: number; alto: number }> {
  if (archivo.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(archivo.name)) {
    const bmp = await createImageBitmap(archivo);
    // Una foto no tiene tamaño de papel: se ajusta a una hoja A4 (vertical u horizontal según la foto).
    const vertical = bmp.height >= bmp.width;
    const kHoja = Math.min((vertical ? 841.89 : 595.28) / bmp.width, (vertical ? 595.28 : 841.89) / bmp.height);
    const anchoHoja = bmp.width * kHoja;
    const altoHoja = bmp.height * kHoja;
    const k = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
    const c = lienzo(Math.max(1, Math.round(bmp.width * k)), Math.max(1, Math.round(bmp.height * k)));
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    yield { lienzo: c, n: 1, total: 1, ancho: anchoHoja, alto: altoHoja };
    return;
  }
  const abierto = await openPdf(archivo);
  try {
    const total = abierto.doc.numPages;
    if (total > MAX_PAGINAS) throw new DocumentError(`«${archivo.name}» tiene ${total} páginas y el reconocimiento de texto admite hasta ${MAX_PAGINAS}.`, "Divide el PDF en partes con «Dividir PDF» y procésalas una por una.");
    for (let n = 1; n <= total; n++) {
      abortarSiCancelado(ctx.signal);
      const pagina = await abierto.doc.getPage(n);
      const base = pagina.getViewport({ scale: 1 });
      const escala = Math.min(3, LADO_MAXIMO / Math.max(base.width, base.height));
      const vista = pagina.getViewport({ scale: escala });
      const c = lienzo(Math.ceil(vista.width), Math.ceil(vista.height));
      await pagina.render({ canvas: c, viewport: vista, background: "#ffffff" }).promise;
      pagina.cleanup();
      yield { lienzo: c, n, total, ancho: base.width, alto: base.height };
    }
  } finally {
    await abierto.destroy();
  }
}

export async function reconocerTexto(archivos: File[], opts: OcrOptions, ctx: Ctx): Promise<Salida[]> {
  ctx.report(0, "Preparando el reconocimiento de texto");
  let t: Trabajador;
  try {
    t = await crearTrabajador();
  } catch {
    throw new DocumentError("No se pudo iniciar el reconocimiento de texto.", "Cierra y vuelve a abrir la aplicación e inténtalo de nuevo.");
  }
  const salidas: Salida[] = [];
  try {
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i]!;
      const partes: { bytes: Uint8Array; ancho: number }[] = [];
      const textos: string[] = [];
      for await (const p of paginasDe(archivo, ctx)) {
        abortarSiCancelado(ctx.signal);
        const desde = i / archivos.length;
        const hasta = (i + 1) / archivos.length;
        ctx.report(desde + ((p.n - 1) / p.total) * (hasta - desde), `Leyendo ${archivo.name}${p.total > 1 ? ` · página ${p.n} de ${p.total}` : ""}`);
        const r = await t.recognize(p.lienzo, { pdfTitle: baseName(archivo.name) }, { text: true, pdf: opts.output === "pdf" });
        textos.push(r.data.text.trim());
        if (opts.output === "pdf" && r.data.pdf) partes.push({ bytes: new Uint8Array(r.data.pdf), ancho: p.ancho });
      }
      const base = safeFileName(baseName(archivo.name));
      if (textos.every((x) => !x)) ctx.warn(`No se encontró texto en «${archivo.name}». Comprueba que la imagen esté nítida, derecha y con buena luz.`);
      if (opts.output === "text") {
        const cuerpo = textos.length > 1 ? textos.map((x, k) => `--- Página ${k + 1} ---\n${x}`).join("\n\n") : (textos[0] ?? "");
        salidas.push({ name: `${base}.txt`, blob: new Blob([cuerpo + "\n"], { type: "text/plain;charset=utf-8" }), mime: "text/plain" });
      } else {
        const unido = await PDFDocument.create();
        for (const { bytes, ancho } of partes) {
          const doc = await PDFDocument.load(bytes);
          for (const pg of await unido.copyPages(doc, doc.getPageIndices())) {
            // Tesseract deja la página del tamaño de la imagen en píxeles (cientos de puntos de más): se devuelve al tamaño real.
            const k = ancho / pg.getWidth();
            pg.scale(k, k);
            unido.addPage(pg);
          }
        }
        salidas.push({ name: `${base}_texto.pdf`, blob: pdfBlob(await unido.save()), mime: MIME_PDF });
      }
    }
  } finally {
    await t.terminate().catch(() => {});
  }
  ctx.warn("El reconocimiento funciona con texto en español (y letras latinas). Revisa el resultado: la calidad depende de lo nítida que sea la imagen.");
  return salidas;
}
