import { traducir } from "@/lib/i18n";
import { aMinutos, type Clase } from "./horario.ts";
import { claseValida } from "./validar.ts";

/**
 * Semestres: el horario de ahora sigue siendo el de siempre; al empezar otro, el que termina se guarda aquí con su
 * nombre para poder verlo o volver a usarlo. Es lógica pura (sin pantalla) para poder probarla.
 */

export interface Semestre {
  id: string;
  nombre: string;
  clases: Clase[];
  /** Cuándo se guardó (ms). */
  terminado: number;
}

export interface DatosSemestres {
  /** Cómo se llama el semestre del horario de ahora. */
  actual: string;
  /** Los guardados, del más reciente al más antiguo. */
  anteriores: Semestre[];
}

export const MAX_SEMESTRES = 20;
export const MAX_NOMBRE_SEMESTRE = 40;

/** «enero-junio» (en la práctica, Feb – Jun) o «agosto-enero», que cruza de año. */
export interface Periodo {
  parte: "primero" | "segundo";
  /** El año en que empieza. */
  anio: number;
}

/** El periodo en curso en una fecha. Enero todavía pertenece al que empezó en agosto. */
export function periodoEn(fecha: Date): Periodo {
  const mes = fecha.getMonth();
  if (mes === 0) return { parte: "segundo", anio: fecha.getFullYear() - 1 };
  return { parte: mes <= 6 ? "primero" : "segundo", anio: fecha.getFullYear() };
}

/** El periodo que más probablemente se está por empezar en una fecha (en vacaciones ya se prepara el siguiente). */
export function periodoQueEmpieza(fecha: Date): Periodo {
  const mes = fecha.getMonth();
  const anio = fecha.getFullYear();
  if (mes <= 3) return { parte: "primero", anio };
  if (mes <= 8) return { parte: "segundo", anio };
  return { parte: "primero", anio: anio + 1 };
}

export const periodoSiguiente = (p: Periodo): Periodo => (p.parte === "primero" ? { parte: "segundo", anio: p.anio } : { parte: "primero", anio: p.anio + 1 });

export const nombreDePeriodo = (p: Periodo): string => (p.parte === "primero" ? traducir("Feb – Jun {a}", { a: p.anio }) : traducir("Ago {a} – Ene {b}", { a: p.anio, b: p.anio + 1 }));

/** El nombre que se propone para el semestre nuevo: nunca el mismo que el de ahora. */
export function sugerirNombre(actual: string, ahora = new Date()): string {
  const periodo = periodoQueEmpieza(ahora);
  const nombre = nombreDePeriodo(periodo);
  return nombre === actual ? nombreDePeriodo(periodoSiguiente(periodo)) : nombre;
}

const limpiarNombre = (texto: string, respaldo: string) => texto.trim().slice(0, MAX_NOMBRE_SEMESTRE) || respaldo;

/** Lee lo guardado descartando lo que venga roto. */
export function normalizarSemestres(dato: unknown, nombrePorDefecto: string): DatosSemestres {
  const d = (typeof dato === "object" && dato !== null ? dato : {}) as { actual?: unknown; anteriores?: unknown };
  const anteriores = (Array.isArray(d.anteriores) ? d.anteriores : [])
    .map((v): Semestre | null => {
      if (typeof v !== "object" || v === null) return null;
      const x = v as Record<string, unknown>;
      if (typeof x.id !== "string" || typeof x.nombre !== "string" || !Array.isArray(x.clases)) return null;
      const clases = x.clases.map(claseValida).filter((c): c is Clase => c !== null);
      return clases.length === 0 ? null : { id: x.id, nombre: limpiarNombre(x.nombre, nombrePorDefecto), clases, terminado: typeof x.terminado === "number" ? x.terminado : 0 };
    })
    .filter((v): v is Semestre => v !== null)
    .slice(0, MAX_SEMESTRES);
  return { actual: limpiarNombre(typeof d.actual === "string" ? d.actual : "", nombrePorDefecto), anteriores };
}

/** Una clase por materia (para listar las materias con su color y su docente), en orden alfabético. */
export function materiasDe(clases: Clase[]): Clase[] {
  const mapa = new Map<string, Clase>();
  for (const c of clases) if (!mapa.has(c.materia)) mapa.set(c.materia, c);
  return [...mapa.values()].sort((a, b) => a.materia.localeCompare(b.materia, "es"));
}

export const horasPorSemana = (clases: Clase[]): number => clases.reduce((total, c) => total + Math.max(0, aMinutos(c.fin) - aMinutos(c.inicio)), 0) / 60;

/** Guarda el semestre de ahora (si tiene clases) y deja puesto el nombre del nuevo. */
export function empezarSemestre(datos: DatosSemestres, clasesActuales: Clase[], nombreNuevo: string, id: string, ahora = Date.now()): DatosSemestres {
  const guardado: Semestre[] = clasesActuales.length > 0 ? [{ id, nombre: datos.actual, clases: clasesActuales, terminado: ahora }] : [];
  return { actual: limpiarNombre(nombreNuevo, datos.actual), anteriores: [...guardado, ...datos.anteriores].slice(0, MAX_SEMESTRES) };
}

/** Vuelve a poner un semestre guardado como el actual; el que estaba puesto se guarda, así que no se pierde nada. */
export function volverASemestre(datos: DatosSemestres, elegido: string, clasesActuales: Clase[], id: string, ahora = Date.now()): { datos: DatosSemestres; clases: Clase[] } | null {
  const semestre = datos.anteriores.find((x) => x.id === elegido);
  if (!semestre) return null;
  const sinEse = { ...datos, anteriores: datos.anteriores.filter((x) => x.id !== elegido) };
  return { datos: empezarSemestre(sinEse, clasesActuales, semestre.nombre, id, ahora), clases: semestre.clases };
}
