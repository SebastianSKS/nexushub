import { baseName, extensionOf, safeFileName } from "@/lib/documents/format";
import { traducir } from "@/lib/i18n";
import { delSistema } from "@/services/mensajes-sistema";
import { esEscritorio } from "@/lib/entorno";
import { useAjustesStore } from "@/store/ajustes-store";
import type { PdfToWordOptions, ToolId } from "@/types/documents";
import { abortarSiCancelado, MIME_DOCX, MIME_PDF, type Ctx, type Salida } from "./comun";

/**
 * Conversión con el programa de office instalado en el equipo: en Windows, Microsoft Office; en Linux, LibreOffice.
 * Cada uno exporta con su propio motor, que es la mejor fidelidad posible (igual que guardar el archivo como PDF
 * desde el programa). Solo en la aplicación de escritorio y si está instalado; si no, o si falla, se usa el motor
 * básico de Nexo (el resto del pipeline).
 *
 * El nombre de cada programa lo pone el programa (no está escrito aquí) porque cambia con el sistema: «Microsoft
 * Word» en Windows, «LibreOffice Writer» en Linux.
 */

type Programa = "word" | "excel" | "powerpoint";
type MotorOffice = "word-pdf" | "pdf-word" | "excel-pdf" | "powerpoint-pdf";

/** Un programa de office de los que se puede usar para convertir. */
export interface ProgramaOffice {
  /** Si está instalado y se puede usar. */
  disponible: boolean;
  /** Cómo se llama en este equipo, para ponerlo en los textos. */
  nombre: string;
}

export interface OfficeDisponible {
  word: ProgramaOffice;
  excel: ProgramaOffice;
  powerpoint: ProgramaOffice;
  /** Si además sabe convertir un PDF en un Word. Solo Microsoft Word. */
  pdfWord: boolean;
  /** El programa completo, para Configuración («Microsoft Office», «LibreOffice»). */
  suite: string;
}

const MOTOR: Partial<Record<ToolId, { motor: MotorOffice; programa: Programa; salida: "pdf" | "docx" }>> = {
  "word-to-pdf": { motor: "word-pdf", programa: "word", salida: "pdf" },
  "pdf-to-word": { motor: "pdf-word", programa: "word", salida: "docx" },
  "excel-to-pdf": { motor: "excel-pdf", programa: "excel", salida: "pdf" },
  "powerpoint-to-pdf": { motor: "powerpoint-pdf", programa: "powerpoint", salida: "pdf" },
};

const NINGUNO: OfficeDisponible = {
  word: { disponible: false, nombre: "Word" },
  excel: { disponible: false, nombre: "Excel" },
  powerpoint: { disponible: false, nombre: "PowerPoint" },
  pdfWord: false,
  suite: "",
};

let disponible: Promise<OfficeDisponible> | null = null;

/** Qué programas de office hay instalados (se pregunta una vez por sesión). */
export function officeDisponible(): Promise<OfficeDisponible> {
  if (!esEscritorio()) return Promise.resolve(NINGUNO);
  disponible ??= import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke<OfficeDisponible>("office_disponible"))
    .catch(() => NINGUNO);
  return disponible;
}

/** ¿Esta herramienta se hará con el programa de office? (para avisarlo antes de convertir). null = con el motor de Nexo. */
export async function programaOfficePara(toolId: ToolId, opciones?: unknown): Promise<string | null> {
  const m = MOTOR[toolId];
  if (!m || !esEscritorio() || !useAjustesStore.getState().usarOffice) return null;
  if (toolId === "pdf-to-word" && (opciones as PdfToWordOptions | undefined)?.mode !== "word") return null; // PDF→Word con el programa solo si se elige
  const p = (await officeDisponible())[m.programa];
  return p.disponible ? p.nombre : null;
}

async function convertir(motor: MotorOffice, archivo: File): Promise<ArrayBuffer> {
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  return invoke<ArrayBuffer>("office_convertir", bytes, { headers: { "x-motor": motor, "x-extension": extensionOf(archivo.name).replace(/^\./, "") } });
}

/**
 * Intenta convertir con el programa de office. Devuelve el resultado, o null si no corresponde (o falló) y hay que
 * usar el motor de Nexo; en ese caso deja un aviso junto al resultado explicando por qué la calidad puede ser menor.
 */
export async function intentarConOffice(toolId: ToolId, archivo: File, opciones: unknown, ctx: Ctx): Promise<Salida[] | null> {
  const m = MOTOR[toolId];
  if (!m || !esEscritorio() || !useAjustesStore.getState().usarOffice) return null;
  // PDF → Word con el programa es una opción que se elige aparte («Con Word»): tarda en abrir el PDF y a veces bastante.
  if (toolId === "pdf-to-word" && (opciones as PdfToWordOptions | undefined)?.mode !== "word") return null;

  const programa = (await officeDisponible())[m.programa];
  const nombre = programa.nombre;
  if (!programa.disponible) {
    ctx.warn(traducir("{nombre} no está instalado en este equipo: se usó el motor básico de Nexo. Con {nombre} instalado, el resultado sale igual que guardándolo desde {nombre}.", { nombre }));
    return null;
  }
  abortarSiCancelado(ctx.signal);
  ctx.report(0.1, traducir("Convirtiendo con {nombre}", { nombre }));
  try {
    const resultado = await convertir(m.motor, archivo);
    abortarSiCancelado(ctx.signal);
    ctx.report(0.95, traducir("Guardando el resultado"));
    ctx.warn(traducir("Convertido con {nombre}: el mismo resultado que guardarlo como {formato} desde {nombre}.", { nombre, formato: m.salida === "pdf" ? "PDF" : "Word" }));
    return [{ name: `${safeFileName(baseName(archivo.name))}.${m.salida}`, blob: new Blob([resultado], { type: m.salida === "pdf" ? MIME_PDF : MIME_DOCX }), mime: m.salida === "pdf" ? MIME_PDF : MIME_DOCX }];
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const motivo = typeof e === "string" ? e : traducir("no se pudo abrir el archivo");
    // El programa se queja en español y con su propio nombre; aquí solo se quita el prefijo para dejar el motivo.
    const limpio = motivo.replace(/^(Office|El programa de office) no pudo convertir el archivo:?\s*/i, "").trim();
    ctx.warn(traducir("No se pudo usar {nombre} ({motivo}). Se usó el motor básico de Nexo: revisa el resultado.", { nombre, motivo: delSistema(limpio) || traducir("no se pudo abrir el archivo") }));
    return null;
  }
}
