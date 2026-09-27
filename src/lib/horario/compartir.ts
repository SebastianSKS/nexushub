/**
 * Compartir el horario con un compañero: se guarda en un archivo (o en un código de texto corto para pegarlo en un mensaje) y
 * la otra persona lo importa. Solo viaja el horario: nada de tu perfil, tu calendario ni tus notas.
 */
import { T } from "@/lib/i18n/nucleo";
import type { Clase } from "./horario";
import { claseValida } from "./validar";

export const FORMATO_HORARIO = "nexo-horario";
export const VERSION_HORARIO = 1;

/** Un horario compartido: lo que se guarda en el archivo. */
export interface HorarioCompartido {
  formato: typeof FORMATO_HORARIO;
  version: number;
  /** Cuándo se creó (fecha ISO). */
  creado: string;
  clases: Clase[];
}

/** Lo que se guarda en el archivo: el horario tal cual, con una marca para reconocerlo al importar. */
export function crearHorarioCompartido(clases: readonly Clase[], ahora: Date = new Date()): HorarioCompartido {
  return { formato: FORMATO_HORARIO, version: VERSION_HORARIO, creado: ahora.toISOString(), clases: clases.map((c) => ({ ...c })) };
}

/** El texto del archivo (JSON con sangría, para que se pueda abrir y leer). */
export function textoDeHorario(clases: readonly Clase[], ahora: Date = new Date()): string {
  return JSON.stringify(crearHorarioCompartido(clases, ahora), null, 2);
}

/** «Nexo-horario-2026-09-27.json». */
export function nombreDeArchivoHorario(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `Nexo-horario-${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}.json`;
}

/** Un horario de verdad tiene unas pocas decenas de clases: un archivo más grande que esto no es un horario. */
export const MAX_BYTES_HORARIO = 200 * 1024;
export const MAX_CLASES_HORARIO = 80;

export type LecturaHorario = { ok: true; clases: Clase[]; descartadas: number } | { ok: false; motivo: string };

/**
 * Lee el texto de un horario compartido. Cada clase se valida como si viniera del almacenamiento (una clase dañada se descarta,
 * el resto se conserva) y recibe un id nuevo: así importar nunca pisa una clase que ya tienes. `motivo` va sin traducir (con T).
 */
export function leerHorarioCompartido(texto: string, nuevoId: () => string): LecturaHorario {
  if (texto.length > MAX_BYTES_HORARIO) return { ok: false, motivo: T("El archivo es demasiado grande para ser un horario de Nexo.") };
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: T("El archivo no se pudo leer: no es un horario de Nexo.") };
  }
  const raiz = crudo && typeof crudo === "object" ? (crudo as Record<string, unknown>) : null;
  if (!raiz || raiz.formato !== FORMATO_HORARIO) return { ok: false, motivo: T("Ese archivo no es un horario de Nexo.") };
  if (typeof raiz.version === "number" && raiz.version > VERSION_HORARIO) {
    return { ok: false, motivo: T("Ese horario se guardó con una versión más nueva de Nexo. Actualiza Nexo para poder importarlo.") };
  }
  if (!Array.isArray(raiz.clases)) return { ok: false, motivo: T("El horario del archivo no trae clases.") };

  const clases: Clase[] = [];
  let descartadas = 0;
  for (const x of raiz.clases.slice(0, MAX_CLASES_HORARIO)) {
    const c = claseValida(x);
    if (c) clases.push({ ...c, id: nuevoId() });
    else descartadas++;
  }
  descartadas += Math.max(0, raiz.clases.length - MAX_CLASES_HORARIO);
  if (clases.length === 0) return { ok: false, motivo: T("El horario del archivo no trae ninguna clase válida.") };
  return { ok: true, clases, descartadas };
}

/** Cómo se junta lo importado con lo que ya tienes: añadirlo (sin repetir) o reemplazar todo el horario. */
export type ModoImportar = "anadir" | "reemplazar";

/** La misma clase es la misma materia, el mismo día y a la misma hora (sin importar mayúsculas ni espacios de más). */
const claveDeClase = (c: Clase): string => `${c.materia.trim().toLowerCase()}|${c.dia}|${c.inicio}|${c.fin}`;

export interface ResultadoImportar {
  clases: Clase[];
  /** Cuántas clases nuevas quedaron en el horario. */
  agregadas: number;
  /** Cuántas ya estaban y no se repitieron. */
  repetidas: number;
}

/** Junta el horario importado con el actual. Al reemplazar, el resultado es solo lo importado. */
export function fusionarClases(actuales: readonly Clase[], nuevas: readonly Clase[], modo: ModoImportar): ResultadoImportar {
  if (modo === "reemplazar") return { clases: nuevas.map((c) => ({ ...c })), agregadas: nuevas.length, repetidas: 0 };
  const vistas = new Set(actuales.map(claveDeClase));
  const agregadas: Clase[] = [];
  let repetidas = 0;
  for (const c of nuevas) {
    const k = claveDeClase(c);
    if (vistas.has(k)) repetidas++;
    else {
      vistas.add(k);
      agregadas.push({ ...c });
    }
  }
  return { clases: [...actuales, ...agregadas], agregadas: agregadas.length, repetidas };
}
