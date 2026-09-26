import { notificarSistema } from "@/lib/notificar";
import { traducir } from "@/lib/i18n";
import { rutaHerramienta } from "@/lib/rutas";
import { getTool } from "@/lib/documents/tools";
import { parseRanges } from "@/lib/documents/ranges";
import { useAjustesStore } from "@/store/ajustes-store";
import { useAppStore } from "@/store/app-store";
import { useDocumentsStore } from "@/store/documents-store";
import type { ToolId } from "@/types/documents";
import { describeError, isAbort } from "./errors";
import { descargar, zipResults } from "./download";
import { runTool } from "./pipeline";

let current: AbortController | null = null;

// Solo en desarrollo: deja el store a mano en la consola para probar herramientas sin la interfaz.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __docs?: unknown }).__docs = useDocumentsStore;

function optionsFor(toolId: ToolId): unknown {
  const o = useDocumentsStore.getState().options;
  switch (toolId) {
    case "compress":
      return o.compress;
    case "images-to-pdf":
      return o.imagesToPdf;
    case "pdf-to-images":
      return o.pdfToImages;
    case "pdf-to-word":
      return o.pdfToWord;
    case "split":
      return o.split;
    case "rotate":
      return o.rotate;
    case "protect-pdf":
      return o.protectPdf;
    case "unlock-pdf":
      return o.unlockPdf;
    case "organize":
      return o.organize;
    case "watermark":
      return o.watermark;
    case "page-numbers":
      return o.pageNumbers;
    case "ocr":
      return o.ocr;
    default:
      return {};
  }
}

/** Devuelve el motivo por el que aún no se puede procesar, o null si todo está listo. */
export function getBlocker(toolId: ToolId, pageCount?: number): string | null {
  const { files, options } = useDocumentsStore.getState();
  const tool = getTool(toolId);
  if (files.length === 0) return traducir("Añade al menos un archivo.");
  if (files.length < tool.minFiles) return traducir("Añade al menos {minFiles} archivos.", { minFiles: tool.minFiles });
  if (files.some((f) => !f.kind || !tool.accepts.includes(f.kind))) return traducir("Quita los archivos que no corresponden a esta herramienta.");
  if (toolId === "split") {
    if (pageCount === undefined) return traducir("Cargando el documento…");
    return parseRanges(options.split.ranges, pageCount).error ?? null;
  }
  if (toolId === "rotate" && Object.keys(options.rotate.rotations).length === 0) return traducir("Gira alguna página para poder aplicar el cambio.");
  if (toolId === "protect-pdf" && !options.protectPdf.password.trim()) return traducir("Escribe una contraseña.");
  if (toolId === "unlock-pdf" && !options.unlockPdf.password.trim()) return traducir("Escribe la contraseña del PDF.");
  if (toolId === "organize") {
    if (pageCount === undefined || options.organize.order.length === 0) return traducir("Cargando el documento…");
    if (options.organize.order.length === pageCount && options.organize.order.every((p, i) => p === i + 1)) return traducir("Cambia el orden o elimina alguna página para poder guardar.");
  }
  if (toolId === "watermark" && !options.watermark.text.trim()) return traducir("Escribe el texto de la marca de agua.");
  if (toolId === "compare-pdf" && files.length !== 2) return traducir("Añade exactamente 2 archivos para comparar.");
  return null;
}

/** Ejecuta la herramienta activa y refleja el avance en la barra de estado. */
export async function startRun(): Promise<void> {
  const docs = useDocumentsStore.getState();
  const app = useAppStore.getState();
  if (!docs.toolId || current) return;

  const tool = getTool(docs.toolId);
  const files = docs.files;
  current = new AbortController();
  docs.clearNotices();
  docs.beginRun();
  app.setOperation({ label: `${traducir(tool.name)}: ${traducir("preparando")}`, progress: 0 });

  try {
    const outcome = await runTool(docs.toolId, files, optionsFor(docs.toolId), {
      signal: current.signal,
      onProgress: (progress, message) => {
        useDocumentsStore.getState().setProgress(progress, message);
        useAppStore.getState().setOperation({ label: `${traducir(tool.name)}: ${message}`, progress });
      },
    });
    const store = useDocumentsStore.getState();
    // Solo en desarrollo: deja el último resultado a mano para inspeccionarlo desde la consola.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __resultadoDocs?: unknown }).__resultadoDocs = outcome;
    store.finishRun(outcome.results, outcome.warnings);
    // Ajuste «Al terminar una conversión → Descargar solo»: un archivo se guarda tal cual; varios, en un ZIP.
    if (useAjustesStore.getState().alTerminar === "descargar" && outcome.results.length > 0) {
      try {
        if (outcome.results.length === 1) await descargar(outcome.results[0]!.blob, outcome.results[0]!.name);
        else await descargar(await zipResults(outcome.results), `${traducir(tool.name)}.zip`);
      } catch (e) {
        store.pushNotice({ severity: "error", title: traducir("No se pudo guardar el resultado."), message: e instanceof Error ? e.message : traducir("Descárgalo desde el panel de resultados.") });
      }
    }
    app.addFilesProcessed(files.length);
    const mensaje =
      outcome.results.length === 1 ? traducir("Tu archivo está listo para descargar.") : traducir("Tus {n} archivos están listos para descargar.", { n: outcome.results.length });
    store.pushNotice({ severity: "success", title: traducir("{herramienta}: listo.", { herramienta: traducir(tool.name) }), message: mensaje });
    if (outcome.results.length > 0) notificarSistema(traducir("{herramienta}: listo", { herramienta: traducir(tool.name) }), mensaje, "conversion-lista", rutaHerramienta(tool.id));
    // Las advertencias (modo básico, ya optimizado…) se muestran junto al resultado, no como avisos flotantes.
  } catch (err) {
    const store = useDocumentsStore.getState();
    if (isAbort(err)) {
      store.resetRun();
      store.pushNotice({ severity: "info", title: traducir("Operación cancelada."), message: traducir("No se guardó ningún resultado.") });
    } else {
      const { message, hint } = describeError(err);
      store.failRun();
      store.pushNotice({ severity: "error", title: message, message: hint });
    }
  } finally {
    current = null;
    useAppStore.getState().setOperation(null);
  }
}

export function cancelRun(): void {
  current?.abort();
}
