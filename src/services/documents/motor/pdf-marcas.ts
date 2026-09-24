import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import type { PageNumbersOptions, WatermarkOptions } from "@/types/documents";
import { DocumentError } from "../errors";
import { abortarSiCancelado, cargarPdf, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";

/** Marca de agua y numeración de páginas: se escribe con la fuente Helvetica que ya trae todo lector de PDF. */

const COLORES = { gray: rgb(0.45, 0.45, 0.45), red: rgb(0.8, 0.1, 0.1), blue: rgb(0.1, 0.3, 0.8), black: rgb(0, 0, 0) } as const;

/** Helvetica solo cubre el alfabeto latino (con acentos y ñ): lo demás se rechaza con un mensaje claro. */
function comprobarTexto(fuente: PDFFont, texto: string) {
  try {
    fuente.encodeText(texto);
  } catch {
    throw new DocumentError("El texto tiene símbolos que el PDF no puede dibujar (por ejemplo emojis).", "Usa letras, números y signos habituales.");
  }
}

export async function ponerMarcaDeAgua(archivos: File[], opts: WatermarkOptions, ctx: Ctx): Promise<Salida[]> {
  const texto = opts.text.trim();
  if (!texto) throw new DocumentError("Escribe el texto de la marca de agua.");
  const salidas: Salida[] = [];
  for (let i = 0; i < archivos.length; i++) {
    abortarSiCancelado(ctx.signal);
    const archivo = archivos[i]!;
    const pdf = await cargarPdf(archivo);
    const fuente = await pdf.embedFont(StandardFonts.HelveticaBold);
    comprobarTexto(fuente, texto);
    const paginas = pdf.getPages();
    const factor = opts.size === "small" ? 0.5 : opts.size === "large" ? 1 : 0.75;
    for (let n = 0; n < paginas.length; n++) {
      const p = paginas[n]!;
      const { width, height } = p.getSize();
      const diagonal = opts.layout === "diagonal";
      // El texto ocupa una fracción del largo disponible (la diagonal de la hoja si va inclinado, el ancho si va recto).
      const disponible = (diagonal ? Math.hypot(width, height) : width) * 0.8 * factor;
      const tam = Math.min(160, Math.max(10, (disponible / fuente.widthOfTextAtSize(texto, 1))));
      const ancho = fuente.widthOfTextAtSize(texto, tam);
      const alto = fuente.heightAtSize(tam, { descender: false });
      const ang = diagonal ? Math.atan2(height, width) : 0;
      // Se centra el texto en la hoja aunque vaya girado: se calcula dónde debe empezar la línea base.
      const x = width / 2 - (ancho / 2) * Math.cos(ang) + (alto / 2) * Math.sin(ang);
      const y = height / 2 - (ancho / 2) * Math.sin(ang) - (alto / 2) * Math.cos(ang);
      p.drawText(texto, { x, y, size: tam, font: fuente, color: COLORES[opts.color], opacity: Math.min(1, Math.max(0.05, opts.opacity / 100)), rotate: degrees((ang * 180) / Math.PI) });
      if (n % 20 === 19) await cederHilo();
    }
    ctx.report((i + 1) / archivos.length, `Marca de agua en ${archivo.name}`);
    salidas.push({ name: safeFileName(`${baseName(archivo.name)}_marca.pdf`), blob: pdfBlob(await pdf.save()), mime: MIME_PDF });
  }
  return salidas;
}

function textoNumero(o: PageNumbersOptions, n: number, total: number): string {
  if (o.format === "of-total") return `${n} de ${total}`;
  if (o.format === "page") return `Página ${n}`;
  return `${n}`;
}

export async function numerarPaginas(archivos: File[], opts: PageNumbersOptions, ctx: Ctx): Promise<Salida[]> {
  const inicio = Number.isFinite(opts.start) ? Math.max(0, Math.min(99999, Math.trunc(opts.start))) : 1;
  const salidas: Salida[] = [];
  for (let i = 0; i < archivos.length; i++) {
    abortarSiCancelado(ctx.signal);
    const archivo = archivos[i]!;
    const pdf: PDFDocument = await cargarPdf(archivo);
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);
    const paginas = pdf.getPages();
    // Con «no numerar la primera» (portada), el número inicial cae en la segunda página.
    const primera = opts.skipFirst ? 1 : 0;
    const total = inicio + paginas.length - 1 - primera;
    for (let n = primera; n < paginas.length; n++) {
      const p = paginas[n]!;
      const { width, height } = p.getSize();
      const t = textoNumero(opts, inicio + n - primera, total);
      const tam = Math.max(8, Math.min(12, width / 50));
      const ancho = fuente.widthOfTextAtSize(t, tam);
      const margen = 28;
      const izq = opts.position.endsWith("left");
      const der = opts.position.endsWith("right");
      const x = izq ? margen : der ? width - margen - ancho : (width - ancho) / 2;
      const y = opts.position.startsWith("top") ? height - margen - tam * 0.7 : margen - tam * 0.3;
      p.drawText(t, { x, y, size: tam, font: fuente, color: rgb(0.2, 0.2, 0.2) });
      if (n % 30 === 29) await cederHilo();
    }
    ctx.report((i + 1) / archivos.length, `Numerando ${archivo.name}`);
    salidas.push({ name: safeFileName(`${baseName(archivo.name)}_numerado.pdf`), blob: pdfBlob(await pdf.save()), mime: MIME_PDF });
  }
  return salidas;
}
