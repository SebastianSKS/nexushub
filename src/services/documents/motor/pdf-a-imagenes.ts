import JSZip from "jszip";
import { traducir } from "@/lib/i18n";
import { baseName, safeFileName } from "@/lib/documents/format";
import { DocumentError } from "../errors";
import { openPdf } from "../pdfjs";

/**
 * Renderiza cada página con pdf.js en un canvas y
 * empaqueta los PNG en un ZIP, todo en el navegador.
 */
export async function pdfAImagenes(
  file: File,
  dpi: number,
  onProgress: (fraction: number, message: string) => void,
  signal: AbortSignal,
): Promise<{ blob: Blob; name: string }> {
  const { doc: pdf, destroy } = await openPdf(file);
  try {
    const total = pdf.numPages;
    const zip = new JSZip();
    const width = String(total).length;
    const scale = dpi / 72;
    const canvas = document.createElement("canvas");

    for (let n = 1; n <= total; n++) {
      if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
      onProgress((n - 1) / total, traducir("Página {n} de {total}", { n, total }));

      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      page.cleanup();

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new DocumentError(traducir("No se pudo generar la imagen de la página {n}.", { n }), traducir("Prueba con una resolución menor."));
      zip.file(`${baseName(file.name)}_pagina-${String(n).padStart(width, "0")}.png`, blob, { compression: "STORE" });
    }

    onProgress(0.98, traducir("Empaquetando el ZIP"));
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    return { blob, name: safeFileName(`${baseName(file.name)}_imagenes.zip`) };
  } finally {
    await destroy();
  }
}
