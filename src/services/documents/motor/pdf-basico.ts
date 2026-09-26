import { PDFDocument, degrees } from "pdf-lib";
import { traducir } from "@/lib/i18n";
import { baseName, safeFileName } from "@/lib/documents/format";
import { parseRanges, rangesToPages } from "@/lib/documents/ranges";
import type { RotateOptions, SplitOptions } from "@/types/documents";
import { DocumentError } from "../errors";
import { abortarSiCancelado, cargarPdf, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";

/** Une varios PDF en el orden en que llegaron. */
export async function unirPdf(files: File[], ctx: Ctx): Promise<Salida[]> {
  const unido = await PDFDocument.create();
  const n = files.length;
  for (let i = 0; i < n; i++) {
    abortarSiCancelado(ctx.signal);
    ctx.report((i / n) * 0.9, traducir("Añadiendo {name} ({i} de {n})", { name: files[i]!.name, i: i + 1, n }));
    const origen = await cargarPdf(files[i]!);
    const paginas = await unido.copyPages(origen, origen.getPageIndices());
    paginas.forEach((p) => unido.addPage(p));
    await cederHilo();
  }
  ctx.report(0.95, traducir("Guardando el PDF unido"));
  return [{ name: safeFileName(`${baseName(files[0]!.name)}_unido.pdf`), blob: pdfBlob(await unido.save()), mime: MIME_PDF }];
}

async function extraer(origen: PDFDocument, paginas: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const copiadas = await doc.copyPages(origen, paginas.map((p) => p - 1));
  copiadas.forEach((p) => doc.addPage(p));
  return doc.save();
}

/** Extrae páginas o rangos de un PDF. */
export async function dividirPdf(file: File, opts: SplitOptions, ctx: Ctx): Promise<Salida[]> {
  const origen = await cargarPdf(file);
  const analizado = parseRanges(opts.ranges, origen.getPageCount());
  if (analizado.error) throw new DocumentError(analizado.error, traducir("Corrige los rangos o elige las páginas en las miniaturas."));

  const base = baseName(file.name);
  const salidas: Salida[] = [];

  if (opts.mode === "single") {
    ctx.report(0.3, traducir("Extrayendo las páginas elegidas"));
    const bytes = await extraer(origen, rangesToPages(analizado.ranges));
    salidas.push({ name: safeFileName(`${base}_paginas.pdf`), blob: pdfBlob(bytes), mime: MIME_PDF });
  } else {
    const total = analizado.ranges.length;
    for (let i = 0; i < total; i++) {
      abortarSiCancelado(ctx.signal);
      const [s, e] = analizado.ranges[i]!;
      ctx.report(i / total, traducir("Creando el rango {rango} ({i} de {total})", { rango: s === e ? s : `${s}-${e}`, i: i + 1, total }));
      const bytes = await extraer(origen, rangesToPages([[s, e]]));
      salidas.push({ name: safeFileName(`${base}_${s === e ? `p${s}` : `p${s}-${e}`}.pdf`), blob: pdfBlob(bytes), mime: MIME_PDF });
      await cederHilo();
    }
  }
  return salidas;
}

/** Gira páginas concretas; cada una suma su ángulo al que ya tenía. */
export async function rotarPdf(file: File, opts: RotateOptions, ctx: Ctx): Promise<Salida[]> {
  const pdf = await cargarPdf(file);
  const total = pdf.getPageCount();
  const entradas = Object.entries(opts.rotations);
  if (entradas.length === 0) throw new DocumentError(traducir("No hay ninguna página para girar."), traducir("Elige el giro con los botones antes de procesar."));

  ctx.report(0.2, traducir("Girando páginas"));
  for (const [clave, angulo] of entradas) {
    const n = Number(clave);
    if (!Number.isInteger(n) || n < 1 || n > total) throw new DocumentError(traducir("La página {clave} no existe en el documento, que tiene {total}.", { clave, total }));
    const pagina = pdf.getPage(n - 1);
    pagina.setRotation(degrees((pagina.getRotation().angle + angulo) % 360));
  }
  ctx.report(0.8, traducir("Guardando el PDF"));
  return [{ name: safeFileName(`${baseName(file.name)}_rotado.pdf`), blob: pdfBlob(await pdf.save()), mime: MIME_PDF }];
}

/** Deja las páginas en el orden indicado (base 1); las que no aparecen se eliminan. */
export async function organizarPdf(file: File, orden: number[], ctx: Ctx): Promise<Salida[]> {
  const origen = await cargarPdf(file);
  const total = origen.getPageCount();
  if (orden.length === 0) throw new DocumentError(traducir("No queda ninguna página."), traducir("Deja al menos una página en el documento."));
  if (orden.some((p) => !Number.isInteger(p) || p < 1 || p > total)) throw new DocumentError(traducir("El orden de las páginas no coincide con el documento."), traducir("Vuelve a cargar el archivo."));
  ctx.report(0.4, traducir("Ordenando las páginas"));
  const bytes = await extraer(origen, orden);
  return [{ name: safeFileName(`${baseName(file.name)}_organizado.pdf`), blob: pdfBlob(bytes), mime: MIME_PDF }];
}
