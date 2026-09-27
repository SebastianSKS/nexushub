/**
 * Compartir el horario con un compañero: se guarda en un archivo (o en un código de texto corto para pegarlo en un mensaje) y
 * la otra persona lo importa. Solo viaja el horario: nada de tu perfil, tu calendario ni tus notas.
 */
import type { Clase } from "./horario";

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
