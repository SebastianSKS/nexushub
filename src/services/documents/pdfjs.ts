import type { PDFDocumentProxy } from "pdfjs-dist";
import { DocumentError } from "./errors";

let libPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Carga pdf.js solo cuando hace falta (no en el servidor ni en el arranque). */
export async function getPdfjs() {
  libPromise ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return lib;
  });
  return libPromise;
}

export interface OpenedPdf {
  doc: PDFDocumentProxy;
  /** Libera el worker y la memoria del documento. */
  destroy: () => Promise<void>;
}

/** Abre un PDF local para renderizarlo en el navegador. */
export async function openPdf(file: File): Promise<OpenedPdf> {
  const lib = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = lib.getDocument({ data });
  try {
    return { doc: await task.promise, destroy: () => task.destroy() };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "PasswordException") {
      throw new DocumentError(`«${file.name}» está protegido con contraseña.`, "Quita la contraseña con su programa original y vuelve a subirlo.");
    }
    throw new DocumentError(`«${file.name}» no se pudo abrir como PDF.`, "El archivo puede estar dañado. Prueba con otro.");
  }
}
