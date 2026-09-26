import type { PDFDocumentProxy } from "pdfjs-dist";
import { traducir } from "@/lib/i18n";
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
      throw new DocumentError(traducir("«{name}» está protegido con contraseña.", { name: file.name }), traducir("Quita la contraseña con su programa original y vuelve a subirlo."));
    }
    throw new DocumentError(traducir("«{name}» no se pudo abrir como PDF.", { name: file.name }), traducir("El archivo puede estar dañado. Prueba con otro."));
  }
}

export type ResultadoAbrirCifrado = { estado: "ok"; doc: OpenedPdf } | { estado: "hace-falta" } | { estado: "incorrecta" };

/** Abre un PDF que puede estar cifrado, probando la contraseña dada (o ninguna). No lanza por contraseña: lo dice en el resultado. */
export async function abrirPdfCifrado(file: File, password: string): Promise<ResultadoAbrirCifrado> {
  const lib = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = lib.getDocument(password ? { data, password } : { data });
  try {
    const doc = await task.promise;
    return { estado: "ok", doc: { doc, destroy: () => task.destroy() } };
  } catch (err) {
    if (err instanceof Error && err.name === "PasswordException") {
      const codigo = (err as Error & { code?: number }).code;
      // 1 = PasswordResponses.NEED_PASSWORD, 2 = PasswordResponses.INCORRECT_PASSWORD.
      return { estado: codigo === 2 ? "incorrecta" : "hace-falta" };
    }
    throw new DocumentError(traducir("«{name}» no se pudo abrir como PDF.", { name: file.name }), traducir("El archivo puede estar dañado. Prueba con otro."));
  }
}
