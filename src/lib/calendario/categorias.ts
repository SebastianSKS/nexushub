import type { NombreGlifo } from "@/lib/glifos";
import { T } from "@/lib/i18n";

/** Tipo de un evento del calendario: sirve para marcarlo con su nombre y su color habitual. */
export type CategoriaEvento = "tarea" | "examen" | "cita" | "recordatorio" | "otro";

export interface InfoCategoria {
  id: CategoriaEvento;
  nombre: string;
  /** Color con el que se marca por defecto (se puede cambiar evento por evento). */
  color: string;
  /** Ícono de Segoe Fluent Icons. */
  glifo: NombreGlifo;
  /** Ejemplo para el campo de título. */
  ejemplo: string;
}

export const CATEGORIAS: readonly InfoCategoria[] = [
  { id: "tarea", nombre: T("Tarea"), color: "#f0812a", glifo: "tarea", ejemplo: T("Entregar el trabajo de matemáticas") },
  { id: "examen", nombre: T("Examen"), color: "#e5484d", glifo: "examen", ejemplo: T("Examen de historia") },
  { id: "cita", nombre: T("Cita"), color: "#2b7de9", glifo: "calendario", ejemplo: T("Cita con el dentista") },
  { id: "recordatorio", nombre: T("Recordatorio"), color: "#8b5cf6", glifo: "campana", ejemplo: T("Pagar el internet") },
  { id: "otro", nombre: T("Otro"), color: "#14b8a6", glifo: "etiqueta", ejemplo: T("Salida con amigos") },
];

/** Color de los cumpleaños en las leyendas (cada amigo conserva el suyo propio en el calendario). */
export const COLOR_CUMPLE = "#e5509f";

export const esCategoria = (x: unknown): x is CategoriaEvento => CATEGORIAS.some((c) => c.id === x);

export const infoCategoria = (id: CategoriaEvento): InfoCategoria => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1]!;
