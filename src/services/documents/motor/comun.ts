import { PDFDocument } from "pdf-lib";
import { traducir } from "@/lib/i18n";
import { DocumentError } from "../errors";

/**
 * Motor de documentos de Nexo: TODO se procesa dentro de la aplicación, sin programas externos
 * (ni LibreOffice, ni Ghostscript, ni poppler) y sin servidor. Los archivos nunca salen del equipo.
 */

export interface Ctx {
  signal: AbortSignal;
  /** fraction: 0-1 del archivo actual. */
  report: (fraction: number, message: string) => void;
  /** Aviso para mostrar junto al resultado (limitaciones, «ya estaba optimizado»…). */
  warn: (message: string) => void;
}

export interface Salida {
  name: string;
  blob: Blob;
  mime: string;
  originalSize?: number;
}

export const MIME_PDF = "application/pdf";
export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: MIME_PDF });
}

export function abortarSiCancelado(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
}

/** Cede el hilo un instante para que la barra de progreso se repinte durante trabajos largos. */
export const cederHilo = () => new Promise<void>((r) => setTimeout(r));

/** Abre un PDF con pdf-lib traduciendo los fallos comunes a mensajes útiles. */
export async function cargarPdf(file: File): Promise<PDFDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    if (doc.getPageCount() < 1) throw new Error(traducir("PDF sin páginas"));
    return doc;
  } catch (err) {
    const texto = err instanceof Error ? `${err.name} ${err.message}` : "";
    if (/encrypt/i.test(texto)) {
      throw new DocumentError(traducir("«{name}» está protegido con contraseña.", { name: file.name }), traducir("Quita la contraseña del PDF con su programa original y vuelve a subirlo."), "PDF_ENCRYPTED");
    }
    throw new DocumentError(traducir("«{name}» no se pudo leer como PDF.", { name: file.name }), traducir("El archivo puede estar dañado. Prueba a abrirlo y guardarlo de nuevo como PDF."), "PDF_INVALID");
  }
}

/** Evita nombres repetidos dentro de un mismo lote: «a.pdf», «a (2).pdf»… */
export function nombresUnicos() {
  const usados = new Set<string>();
  return (name: string): string => {
    if (!usados.has(name)) {
      usados.add(name);
      return name;
    }
    const punto = name.lastIndexOf(".");
    const base = punto > 0 ? name.slice(0, punto) : name;
    const ext = punto > 0 ? name.slice(punto) : "";
    let n = 2;
    while (usados.has(`${base} (${n})${ext}`)) n++;
    const unico = `${base} (${n})${ext}`;
    usados.add(unico);
    return unico;
  };
}

export async function bytesDe(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
