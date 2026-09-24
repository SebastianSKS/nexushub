import { baseName, extensionOf, safeFileName } from "@/lib/documents/format";
import { esEscritorio } from "@/lib/entorno";
import { useAjustesStore } from "@/store/ajustes-store";
import type { PdfToWordOptions, ToolId } from "@/types/documents";
import { abortarSiCancelado, MIME_DOCX, MIME_PDF, type Ctx, type Salida } from "./comun";

/**
 * Conversión con Microsoft Office instalado en el equipo (Word, Excel y PowerPoint exportan con su propio motor):
 * la mejor fidelidad posible, igual que guardar el archivo como PDF desde Office. Solo en la aplicación de escritorio
 * de Windows y si Office está instalado; si no, o si falla, se usa el motor básico de NexusHub (el resto del pipeline).
 */

type Programa = "word" | "excel" | "powerpoint";
type MotorOffice = "word-pdf" | "pdf-word" | "excel-pdf" | "powerpoint-pdf";

const NOMBRE_PROGRAMA: Record<Programa, string> = { word: "Word", excel: "Excel", powerpoint: "PowerPoint" };

const MOTOR: Partial<Record<ToolId, { motor: MotorOffice; programa: Programa; salida: "pdf" | "docx" }>> = {
  "word-to-pdf": { motor: "word-pdf", programa: "word", salida: "pdf" },
  "pdf-to-word": { motor: "pdf-word", programa: "word", salida: "docx" },
  "excel-to-pdf": { motor: "excel-pdf", programa: "excel", salida: "pdf" },
  "powerpoint-to-pdf": { motor: "powerpoint-pdf", programa: "powerpoint", salida: "pdf" },
};

let disponible: Promise<Record<Programa, boolean>> | null = null;

/** Qué programas de Office hay instalados (se pregunta una vez por sesión). */
export function officeDisponible(): Promise<Record<Programa, boolean>> {
  if (!esEscritorio()) return Promise.resolve({ word: false, excel: false, powerpoint: false });
  disponible ??= import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke<Record<Programa, boolean>>("office_disponible"))
    .catch(() => ({ word: false, excel: false, powerpoint: false }));
  return disponible;
}

/** ¿Esta herramienta se hará con Office? (para avisarlo en pantalla antes de convertir). null = con el motor de NexusHub. */
export async function programaOfficePara(toolId: ToolId, opciones?: unknown): Promise<string | null> {
  const m = MOTOR[toolId];
  if (!m || !esEscritorio() || !useAjustesStore.getState().usarOffice) return null;
  if (toolId === "pdf-to-word" && (opciones as PdfToWordOptions | undefined)?.mode !== "word") return null; // PDF→Word con Word solo si se elige
  return (await officeDisponible())[m.programa] ? NOMBRE_PROGRAMA[m.programa] : null;
}

async function convertir(motor: MotorOffice, archivo: File): Promise<ArrayBuffer> {
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  return invoke<ArrayBuffer>("office_convertir", bytes, { headers: { "x-motor": motor, "x-extension": extensionOf(archivo.name).replace(/^\./, "") } });
}

/**
 * Intenta convertir con Office. Devuelve el resultado, o null si no corresponde (o falló) y hay que usar el motor de
 * NexusHub; en ese caso deja un aviso junto al resultado explicando por qué la calidad puede ser menor.
 */
export async function intentarConOffice(toolId: ToolId, archivo: File, opciones: unknown, ctx: Ctx): Promise<Salida[] | null> {
  const m = MOTOR[toolId];
  if (!m || !esEscritorio() || !useAjustesStore.getState().usarOffice) return null;
  // PDF → Word con Word es una opción que se elige aparte («Con Word»): Word tarda en abrir PDF y a veces bastante.
  if (toolId === "pdf-to-word" && (opciones as PdfToWordOptions | undefined)?.mode !== "word") return null;

  const nombre = NOMBRE_PROGRAMA[m.programa];
  if (!(await officeDisponible())[m.programa]) {
    ctx.warn(`Microsoft ${nombre} no está instalado en este equipo: se usó el motor básico de NexusHub. Con ${nombre} instalado, el resultado sale igual que guardándolo desde ${nombre}.`);
    return null;
  }
  abortarSiCancelado(ctx.signal);
  ctx.report(0.1, `Convirtiendo con Microsoft ${nombre}`);
  try {
    const resultado = await convertir(m.motor, archivo);
    abortarSiCancelado(ctx.signal);
    ctx.report(0.95, "Guardando el resultado");
    ctx.warn(`Convertido con Microsoft ${nombre}: el mismo resultado que guardarlo como ${m.salida === "pdf" ? "PDF" : "Word"} desde ${nombre}.`);
    return [{ name: `${safeFileName(baseName(archivo.name))}.${m.salida}`, blob: new Blob([resultado], { type: m.salida === "pdf" ? MIME_PDF : MIME_DOCX }), mime: m.salida === "pdf" ? MIME_PDF : MIME_DOCX }];
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const motivo = typeof e === "string" ? e : "no se pudo abrir el archivo";
    ctx.warn(`No se pudo usar Microsoft ${nombre} (${motivo.replace(/^Office no pudo convertir el archivo:?\s*/i, "").trim() || "no se pudo abrir el archivo"}). Se usó el motor básico de NexusHub: revisa el resultado.`);
    return null;
  }
}
