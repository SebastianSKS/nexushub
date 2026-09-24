import { getTool } from "@/lib/documents/tools";
import type { CompressOptions, OcrOptions, OrganizeOptions, PageNumbersOptions, WatermarkOptions, ImagesToPdfOptions, PdfToImagesOptions, PdfToWordOptions, ProtectOptions, QueuedFile, ResultItem, RotateOptions, SplitOptions, ToolId, UnlockOptions } from "@/types/documents";
import { DocumentError } from "./errors";
import { compararPdf } from "./motor/comparar-pdf";
import { abortarSiCancelado, type Ctx, type Salida } from "./motor/comun";
import { comprimirPdf } from "./motor/comprimir";
import { excelAPdf } from "./motor/excel-a-pdf";
import { imagenesAPdf } from "./motor/imagenes-a-pdf";
import { intentarConOffice } from "./motor/office";
import { pdfAImagenes } from "./motor/pdf-a-imagenes";
import { pdfAWord } from "./motor/pdf-a-word";
import { reconocerTexto } from "./motor/ocr";
import { dividirPdf, organizarPdf, rotarPdf, unirPdf } from "./motor/pdf-basico";
import { quitarContrasenaPdf } from "./motor/pdf-desprotegido";
import { numerarPaginas, ponerMarcaDeAgua } from "./motor/pdf-marcas";
import { protegerPdf } from "./motor/pdf-protegido";
import { powerpointAPdf } from "./motor/powerpoint-a-pdf";
import { verificarContenido } from "./motor/verificar";
import { docxToPdfInBrowser } from "./motor/word-a-pdf";

export interface RunHooks {
  /** progress: 0-100 */
  onProgress: (progress: number, message: string) => void;
  signal: AbortSignal;
}

export interface RunOutcome {
  results: ResultItem[];
  warnings: string[];
}

const nuevoId = () => crypto.randomUUID();

/**
 * Ejecuta una herramienta. TODO ocurre en tu equipo, sin servidor: los archivos nunca salen de él. Las conversiones
 * de Office usan Microsoft Office si está instalado (ver motor/office.ts) y, si no, el motor propio de NexusHub.
 */
export async function runTool(toolId: ToolId, files: QueuedFile[], options: unknown, hooks: RunHooks): Promise<RunOutcome> {
  const tool = getTool(toolId);
  const { onProgress, signal } = hooks;
  const advertencias: string[] = [];

  // 1) El contenido real de cada archivo debe corresponder a la herramienta.
  onProgress(0, "Comprobando los archivos");
  for (const f of files) {
    abortarSiCancelado(signal);
    const permitido = f.kind && tool.accepts.includes(f.kind) ? f.kind : tool.accepts[0]!;
    await verificarContenido(f.file, permitido);
  }

  const contexto = (desde: number, hasta: number): Ctx => ({
    signal,
    report: (fraccion, mensaje) => onProgress(desde + Math.min(Math.max(fraccion, 0), 1) * (hasta - desde), mensaje),
    warn: (m) => {
      if (!advertencias.includes(m)) advertencias.push(m);
    },
  });

  let salidas: Salida[] = [];
  const archivos = files.map((f) => f.file);

  switch (toolId) {
    case "merge":
      salidas = await unirPdf(archivos, contexto(2, 98));
      break;
    case "split":
      salidas = await dividirPdf(archivos[0]!, options as SplitOptions, contexto(2, 98));
      break;
    case "rotate":
      salidas = await rotarPdf(archivos[0]!, options as RotateOptions, contexto(2, 98));
      break;
    case "images-to-pdf":
      salidas = await imagenesAPdf(archivos, options as ImagesToPdfOptions, contexto(2, 98));
      break;
    case "compress":
      salidas = await comprimirPdf(archivos, options as CompressOptions, contexto(2, 98));
      break;
    case "protect-pdf":
      salidas = await protegerPdf(archivos, (options as ProtectOptions).password, contexto(2, 98));
      break;
    case "unlock-pdf":
      salidas = await quitarContrasenaPdf(archivos, (options as UnlockOptions).password, contexto(2, 98));
      break;
    case "organize":
      salidas = await organizarPdf(archivos[0]!, (options as OrganizeOptions).order, contexto(2, 98));
      break;
    case "watermark":
      salidas = await ponerMarcaDeAgua(archivos, options as WatermarkOptions, contexto(2, 98));
      break;
    case "page-numbers":
      salidas = await numerarPaginas(archivos, options as PageNumbersOptions, contexto(2, 98));
      break;
    case "ocr":
      salidas = await reconocerTexto(archivos, options as OcrOptions, contexto(2, 98));
      break;
    case "compare-pdf":
      salidas = await compararPdf(archivos[0]!, archivos[1]!, contexto(2, 98));
      break;
    default: {
      // Herramientas que convierten un archivo tras otro.
      const n = archivos.length;
      for (let i = 0; i < n; i++) {
        abortarSiCancelado(signal);
        const file = archivos[i]!;
        const ctx = contexto(2 + (i / n) * 96, 2 + ((i + 1) / n) * 96);
        const etiqueta = (m: string) => (n > 1 ? `${m} · ${file.name} (${i + 1} de ${n})` : m);
        const rep = ctx.report;
        ctx.report = (f, m) => rep(f, etiqueta(m));

        // Word, Excel, PowerPoint y PDF a Word: con Microsoft Office si está instalado (calidad de Office); si no, el motor de NexusHub.
        const conOffice = await intentarConOffice(toolId, file, options, ctx);
        if (conOffice) {
          salidas.push(...conOffice);
          continue;
        }

        if (toolId === "word-to-pdf") {
          const r = await docxToPdfInBrowser(file, ctx.report, signal);
          r.warnings.forEach(ctx.warn);
          salidas.push({ name: r.name, blob: r.blob, mime: "application/pdf" });
        } else if (toolId === "pdf-to-images") {
          const r = await pdfAImagenes(file, (options as PdfToImagesOptions).dpi, ctx.report, signal);
          salidas.push({ name: r.name, blob: r.blob, mime: "application/zip" });
        } else if (toolId === "excel-to-pdf") salidas.push(...(await excelAPdf(file, ctx)));
        else if (toolId === "powerpoint-to-pdf") salidas.push(...(await powerpointAPdf(file, ctx)));
        else if (toolId === "pdf-to-word") salidas.push(...(await pdfAWord(file, options as PdfToWordOptions, ctx)));
        else throw new DocumentError(`La herramienta «${tool.name}» no está disponible.`);
      }
    }
  }

  const results: ResultItem[] = salidas.map((s) => {
    const item: ResultItem = { id: nuevoId(), name: s.name, size: s.blob.size, mime: s.mime, blob: s.blob };
    if (toolId === "compress" && s.originalSize) {
      item.originalSize = s.originalSize;
      item.savedPercent = Math.max(0, Math.round((1 - s.blob.size / s.originalSize) * 100));
    }
    return item;
  });
  onProgress(100, "Listo");
  return { results, warnings: advertencias };
}
