import type { NombreGlifo } from "./glifos.ts";
import { T } from "./i18n/nucleo.ts";

/**
 * La lista de «primeros pasos» de Inicio: cinco cosas que enseñan el valor de Nexo en pocos minutos (poner tu nombre, cargar
 * el horario, crear las carpetas de tus materias, añadir un examen y probar Ctrl+K). Cada paso se marca solo cuando la
 * persona lo hace. Es lógica pura, sin pantalla: qué pasos hay, cuáles van por cuáles, y CUÁNDO se muestra la lista para no
 * pisar las guías, las novedades ni a quien ya lo hizo todo.
 */

export type PasoId = "nombre" | "horario" | "carpetas" | "examen" | "buscador";

export interface PasoDef {
  id: PasoId;
  glifo: NombreGlifo;
  titulo: string;
  texto: string;
  /** Adónde lleva el botón del paso (una ruta de Nexo). Sin ruta, cada paso hace lo suyo (abrir el perfil, el buscador). */
  ruta?: string;
  /** Texto del botón. */
  accion: string;
  /** Solo tiene sentido en la aplicación de escritorio (las carpetas son carpetas de verdad). */
  soloEscritorio?: boolean;
}

export const PASOS: readonly PasoDef[] = [
  { id: "nombre", glifo: "persona", titulo: T("Pon tu nombre"), texto: T("Para que Nexo te salude y sepas que es tuyo. Se queda solo en tu equipo."), accion: T("Poner mi nombre") },
  { id: "horario", glifo: "reloj", titulo: T("Carga tu horario"), texto: T("Toma una captura o una foto de tu horario y Nexo lo llena solo, con un aviso antes de cada clase."), ruta: "/horario", accion: T("Cargar horario") },
  { id: "carpetas", glifo: "carpeta", titulo: T("Crea las carpetas de tus materias"), texto: T("Una por materia, para guardar tus tareas. Se crean desde tu horario con un clic."), ruta: "/documentos/carpetas", accion: T("Ver mis tareas"), soloEscritorio: true },
  { id: "examen", glifo: "examen", titulo: T("Añade tu primer examen o tarea"), texto: T("Con fecha y hora, y Nexo te avisa antes para que no se te pase."), ruta: "/calendario", accion: T("Abrir el calendario") },
  { id: "buscador", glifo: "buscar", titulo: T("Prueba la búsqueda (Ctrl + K)"), texto: T("Escribe una materia, una tarea o una palabra: también busca dentro de tus PDF, Word, Excel y PowerPoint."), accion: T("Probar la búsqueda") },
];

/** Qué pasos hay en cada entorno (las carpetas de materias solo existen en la aplicación de escritorio). */
export const pasosDe = (escritorio: boolean): readonly PasoDef[] => PASOS.filter((p) => escritorio || !p.soloEscritorio);

export type EstadoPasos = Record<PasoId, boolean>;

export interface Progreso {
  hechos: number;
  total: number;
  /** El primer paso que falta (el que se destaca), o null si están todos. */
  siguiente: PasoId | null;
  completo: boolean;
}

export function progresoDe(estado: EstadoPasos, escritorio: boolean): Progreso {
  const pasos = pasosDe(escritorio);
  const hechos = pasos.filter((p) => estado[p.id]).length;
  const faltante = pasos.find((p) => !estado[p.id]);
  return { hechos, total: pasos.length, siguiente: faltante?.id ?? null, completo: hechos === pasos.length };
}

/** Lo que se recuerda entre sesiones: lo que no se puede saber mirando los datos (buscar y crear carpetas) y si ya se cerró. */
export interface PasosGuardados {
  buscador: boolean;
  carpetas: boolean;
  /** La persona la ocultó a propósito. */
  descartado: boolean;
  /** Ya se terminó (o ya estaba todo hecho): no vuelve a salir sola. */
  completado: boolean;
}

export const PASOS_GUARDADOS_INICIAL: PasosGuardados = { buscador: false, carpetas: false, descartado: false, completado: false };

/** Lee lo guardado (cualquier cosa) campo a campo: lo que no sea un «true» claro es falso. */
export function normalizarPasosGuardados(crudo: unknown): PasosGuardados {
  const d = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  return { buscador: d.buscador === true, carpetas: d.carpetas === true, descartado: d.descartado === true, completado: d.completado === true };
}

export interface CondicionesDeMuestra {
  guardado: PasosGuardados;
  progreso: Progreso;
  /** Ya se leyó lo guardado (hasta entonces no se decide nada, para no parpadear). */
  cargado: boolean;
  /** Ya vio la guía de bienvenida (la primera vez, esa va primero). */
  bienvenidaVista: boolean;
  /** Hay una guía o el cuadro de novedades a la vista: la lista espera para no apilar cosas. */
  algoAbierto: boolean;
}

/** ¿Se muestra la lista ahora? Nunca antes de la bienvenida, ni encima de otra guía, ni a quien la cerró o ya lo hizo todo. */
export function debeMostrarse(c: CondicionesDeMuestra): boolean {
  if (!c.cargado || c.guardado.descartado || c.guardado.completado) return false;
  if (c.progreso.completo) return false;
  return c.bienvenidaVista && !c.algoAbierto;
}
