import { useConsejosStore } from "@/store/consejos-store";
import { notificarSistema } from "@/lib/notificar";
import { traducir } from "@/lib/i18n";
import { rutaHerramienta } from "@/lib/rutas";
import { planAPdf } from "@/lib/documents/convertir-todo";
import { getTool } from "@/lib/documents/tools";
import { parseRanges } from "@/lib/documents/ranges";
import { useAjustesStore } from "@/store/ajustes-store";
import { useAppStore } from "@/store/app-store";
import { useColaStore, type Trabajo } from "@/store/cola-store";
import { CLAVE_DE_OPCIONES, useDocumentsStore } from "@/store/documents-store";
import type { ToolId } from "@/types/documents";
import { crearProcesador } from "./cola";
import { descargar, zipResults } from "./download";
import { runTool } from "./pipeline";

// Solo en desarrollo: deja los stores a mano en la consola para probar herramientas sin la interfaz.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") Object.assign(window, { __docs: useDocumentsStore, __cola: useColaStore });

const nombreDe = (t: Trabajo) => traducir(getTool(t.toolId).name);

/** Los cuadros «Guardar como» salen de uno en uno y sin frenar la cola. */
let guardando: Promise<void> = Promise.resolve();

/** Ajuste «Al terminar una conversión → Descargar solo»: un archivo se guarda tal cual; varios, en un ZIP. */
function descargarSolo(trabajo: Trabajo): void {
  if (useAjustesStore.getState().alTerminar !== "descargar" || trabajo.resultados.length === 0) return;
  guardando = guardando.then(async () => {
    const [primero, ...resto] = trabajo.resultados;
    try {
      const d = resto.length === 0 ? await descargar(primero!.blob, primero!.name) : await descargar(await zipResults(trabajo.resultados), `${nombreDe(trabajo)}.zip`);
      if (!d.cancelado) useColaStore.getState().anotarGuardado(trabajo.id, resto.length === 0 ? primero!.id : "zip", d);
    } catch (e) {
      useDocumentsStore.getState().pushNotice({ severity: "error", title: traducir("No se pudo guardar el resultado."), message: e instanceof Error ? e.message : traducir("Descárgalo desde el panel de resultados.") });
    }
  });
}

const mensajeListo = (n: number) => (n === 1 ? traducir("Tu archivo está listo para descargar.") : traducir("Tus {n} archivos están listos para descargar.", { n }));

const procesador = crearProcesador({
  ejecutar: (trabajo, ganchos) => runTool(trabajo.toolId, trabajo.files, trabajo.options, ganchos),
  alAvanzar: (trabajo) => {
    const enEspera = useColaStore.getState().trabajos.filter((t) => t.estado === "esperando").length;
    const cola = enEspera > 0 ? ` · ${traducir("{n} en espera", { n: enEspera })}` : "";
    useAppStore.getState().setOperation({ label: `${nombreDe(trabajo)}: ${trabajo.mensaje || traducir("preparando")}${cola}`, progress: trabajo.progreso });
  },
  alTerminar: (trabajo) => {
    // Solo en desarrollo: deja el último resultado a mano para inspeccionarlo desde la consola.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __resultadoDocs: { results: trabajo.resultados, warnings: trabajo.avisos } });
    if (trabajo.resultados.length > 0) useConsejosStore.getState().ofrecer("primer-resultado");
    useAppStore.getState().addFilesProcessed(trabajo.files.length);
    useDocumentsStore.getState().pushNotice({ severity: "success", title: traducir("{herramienta}: listo.", { herramienta: nombreDe(trabajo) }), message: mensajeListo(trabajo.resultados.length) });
    descargarSolo(trabajo);
  },
  alFallar: (trabajo) => {
    useDocumentsStore.getState().pushNotice({ severity: "error", title: `${nombreDe(trabajo)}: ${trabajo.error!.message}`, message: trabajo.error!.hint });
  },
  // El aviso de Windows sale al acabar toda la tanda, no uno por cada trabajo.
  alVaciar: (hechos) => {
    useAppStore.getState().setOperation(null);
    const conResultado = hechos.filter((t) => t.resultados.length > 0);
    if (conResultado.length === 1) {
      const t = conResultado[0]!;
      notificarSistema(traducir("{herramienta}: listo", { herramienta: nombreDe(t) }), mensajeListo(t.resultados.length), "conversion-lista", rutaHerramienta(t.toolId));
    } else if (conResultado.length > 1) {
      notificarSistema(traducir("{n} conversiones listas", { n: conResultado.length }), mensajeListo(conResultado.reduce((n, t) => n + t.resultados.length, 0)), "conversion-lista", "/documentos");
    }
  },
});

function optionsFor(toolId: ToolId): unknown {
  const clave = CLAVE_DE_OPCIONES[toolId];
  return clave ? useDocumentsStore.getState().options[clave] : {};
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

/** Pone en la cola lo que está preparado en la herramienta activa y la deja libre para el siguiente. */
export function encolarActual(): void {
  const docs = useDocumentsStore.getState();
  if (!docs.toolId || getBlocker(docs.toolId, docs.pageCount) !== null) return;
  useColaStore.getState().agregar({ toolId: docs.toolId, files: docs.files, options: structuredClone(optionsFor(docs.toolId)) });
  docs.clearNotices();
  docs.clearFiles();
  void procesador.arrancar();
}

/** «Iniciar cola» (en Documentos): un trabajo por cada tipo de archivo; los que no se convierten (los PDF) se quedan. */
export function encolarTodoAPdf(): void {
  const docs = useDocumentsStore.getState();
  const plan = planAPdf(docs.files);
  if (plan.length === 0) return;
  docs.clearNotices();
  for (const { toolId, files } of plan) useColaStore.getState().agregar({ toolId, files, options: structuredClone(optionsFor(toolId)) });
  const encolados = new Set(plan.flatMap((p) => p.files.map((f) => f.id)));
  useDocumentsStore.setState({ files: docs.files.filter((f) => !encolados.has(f.id)) });
  void procesador.arrancar();
}

export const cancelarTrabajo = (id: string): void => procesador.cancelar(id);
export const cancelarCola = (): void => procesador.cancelarTodo();
