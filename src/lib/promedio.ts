/**
 * Promedio de calificaciones: lo que hace falta para saber cómo vas en cada materia y cuánto necesitas sacar en lo que falta.
 * Solo cálculos, sin pantalla: así se prueban con números fijos. Cada materia tiene evaluaciones (un examen, un proyecto…)
 * con un peso en porcentaje y, cuando ya se calificó, su calificación.
 */

/** Una evaluación de una materia: pesa un porcentaje del total y tiene calificación cuando ya se calificó. */
export interface Evaluacion {
  id: string;
  nombre: string;
  /** Porcentaje del total de la materia (0–100). */
  peso: number;
  /** La calificación obtenida, o null si todavía no se califica. */
  calificacion: number | null;
}

/** La escala con la que se califica en tu escuela: hasta cuánto se puede sacar y desde cuánto se aprueba. */
export interface Escala {
  maximo: number;
  minimoAprobatorio: number;
}

export const ESCALA_DIEZ: Escala = { maximo: 10, minimoAprobatorio: 6 };
export const ESCALA_CIEN: Escala = { maximo: 100, minimoAprobatorio: 70 };

/** Redondea a cierto número de decimales sin los errores típicos de coma flotante (1.005 → 1.01). */
export function redondear(n: number, decimales = 1): number {
  const f = 10 ** decimales;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Suma de los pesos de las evaluaciones que ya tienen calificación. */
export function pesoEvaluado(evaluaciones: readonly Evaluacion[]): number {
  return evaluaciones.reduce((s, e) => (e.calificacion === null ? s : s + e.peso), 0);
}

/** Lo que todavía falta para llegar al 100 %: evaluaciones sin calificar y porcentaje que aún no se ha repartido. */
export function pesoPendiente(evaluaciones: readonly Evaluacion[]): number {
  return Math.max(0, 100 - pesoEvaluado(evaluaciones));
}

/** Lo que ya sumaste en la escala de la materia: cada calificación por su peso (8 en un 30 % suma 2.4). */
export function puntosGanados(evaluaciones: readonly Evaluacion[]): number {
  return evaluaciones.reduce((s, e) => (e.calificacion === null ? s : s + (e.calificacion * e.peso) / 100), 0);
}

/** Cómo vas hasta ahora: el promedio de lo ya calificado, tomando cada evaluación por su peso. Null si todavía no hay ninguna calificación. */
export function promedioParcial(evaluaciones: readonly Evaluacion[]): number | null {
  const peso = pesoEvaluado(evaluaciones);
  if (peso <= 0) return null;
  return (puntosGanados(evaluaciones) * 100) / peso;
}

/** La calificación final de la materia, solo cuando ya está calificado el 100 % (con un margen para los decimales de los pesos). Si no, null. */
export function calificacionFinal(evaluaciones: readonly Evaluacion[]): number | null {
  if (pesoPendiente(evaluaciones) > 0.001) return null;
  return puntosGanados(evaluaciones);
}

/** Qué te queda por hacer para aprobar. */
export type Necesario =
  /** Ya alcanzaste el mínimo aunque saques 0 en lo que falta. */
  | { tipo: "aprobada" }
  /** Ya no queda nada por calificar. */
  | { tipo: "terminada"; aprobada: boolean }
  /** Necesitas al menos esta calificación promedio en lo que falta. */
  | { tipo: "necesitas"; calificacion: number }
  /** Ni con la calificación máxima en lo que falta llegas al mínimo. */
  | { tipo: "imposible"; maxima: number };

/** ¿Cuánto necesitas sacar, en promedio, en lo que falta por calificar para llegar al mínimo aprobatorio? */
export function necesarioParaAprobar(evaluaciones: readonly Evaluacion[], escala: Escala): Necesario {
  const falta = pesoPendiente(evaluaciones);
  const ganados = puntosGanados(evaluaciones);
  if (falta <= 0.001) return { tipo: "terminada", aprobada: ganados + 1e-9 >= escala.minimoAprobatorio };
  if (ganados + 1e-9 >= escala.minimoAprobatorio) return { tipo: "aprobada" };
  const necesario = ((escala.minimoAprobatorio - ganados) * 100) / falta;
  if (necesario > escala.maximo + 1e-9) return { tipo: "imposible", maxima: ganados + (escala.maximo * falta) / 100 };
  return { tipo: "necesitas", calificacion: necesario };
}

/** Cómo va una materia, en una palabra (para el color y el texto de la tarjeta). */
export type EstadoMateria = "sin-datos" | "en-curso" | "en-riesgo" | "asegurada" | "perdida" | "aprobada" | "reprobada";

/** «En riesgo»: lo que necesitas en lo que falta es casi la calificación máxima. */
const UMBRAL_RIESGO = 0.9;

export function estadoMateria(evaluaciones: readonly Evaluacion[], escala: Escala): EstadoMateria {
  if (pesoEvaluado(evaluaciones) <= 0) return "sin-datos";
  const n = necesarioParaAprobar(evaluaciones, escala);
  if (n.tipo === "terminada") return n.aprobada ? "aprobada" : "reprobada";
  if (n.tipo === "aprobada") return "asegurada";
  if (n.tipo === "imposible") return "perdida";
  return n.calificacion >= escala.maximo * UMBRAL_RIESGO ? "en-riesgo" : "en-curso";
}

/** Una materia con sus evaluaciones. Los créditos son opcionales: si tu escuela promedia por créditos, pesan más las que tienen más. */
export interface Materia {
  id: string;
  nombre: string;
  creditos: number;
  evaluaciones: Evaluacion[];
}

/**
 * El promedio de todas tus materias. Si una todavía no termina se usa cómo va hasta ahora (su promedio parcial), a menos que pidas
 * solo las terminadas. Cada materia pesa por sus créditos (1 si no se puso). Null si no hay ninguna que cuente.
 */
export function promedioGeneral(materias: readonly Materia[], soloTerminadas = false): number | null {
  let suma = 0;
  let pesos = 0;
  for (const m of materias) {
    const nota = soloTerminadas ? calificacionFinal(m.evaluaciones) : (calificacionFinal(m.evaluaciones) ?? promedioParcial(m.evaluaciones));
    if (nota === null) continue;
    const peso = m.creditos > 0 ? m.creditos : 1;
    suma += nota * peso;
    pesos += peso;
  }
  return pesos > 0 ? suma / pesos : null;
}

/** Reparte el 100 % en partes iguales (con un decimal): 3 evaluaciones → 33.3, 33.3 y 33.4, para que sumen justo 100. */
export function repartirPesos(cuantas: number): number[] {
  if (cuantas <= 0) return [];
  const base = Math.floor((1000 / cuantas)) / 10;
  const pesos = Array.from({ length: cuantas }, () => base);
  pesos[cuantas - 1] = redondear(100 - base * (cuantas - 1), 1);
  return pesos;
}

/** El porcentaje que todavía no se ha repartido entre las evaluaciones (para sugerirlo al añadir una nueva). */
export function pesoSinRepartir(evaluaciones: readonly Evaluacion[]): number {
  const repartido = evaluaciones.reduce((s, e) => s + e.peso, 0);
  return Math.max(0, redondear(100 - repartido, 1));
}

/** Las evaluaciones con las que arranca una materia nueva (se pueden cambiar): dos parciales, tareas y un proyecto. */
export function evaluacionesIniciales(nuevoId: () => string, nombres: readonly [string, string, string, string]): Evaluacion[] {
  const pesos = [30, 30, 20, 20];
  return nombres.map((nombre, i) => ({ id: nuevoId(), nombre, peso: pesos[i]!, calificacion: null }));
}

/** Lo que se guarda en el equipo. */
export interface DatosPromedio {
  escala: Escala;
  materias: Materia[];
}

export const MAX_MATERIAS = 40;
export const MAX_EVALUACIONES = 20;

/** Una escala con valores que tengan sentido: máximo positivo y mínimo aprobatorio entre 0 y el máximo. */
export function acotarEscala(e: Escala): Escala {
  const maximo = Math.min(1000, Math.max(1, Number.isFinite(e.maximo) ? e.maximo : ESCALA_DIEZ.maximo));
  const minimo = Number.isFinite(e.minimoAprobatorio) ? e.minimoAprobatorio : maximo === 100 ? 70 : 6;
  return { maximo, minimoAprobatorio: Math.min(maximo, Math.max(0, minimo)) };
}

const numero = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Lee lo guardado (cualquier cosa: un archivo dañado, una versión vieja, un valor cambiado a mano) y deja solo datos válidos:
 * nombres cortos, pesos entre 0 y 100, calificaciones dentro de la escala, sin ids repetidos y con un máximo razonable de
 * materias y evaluaciones. Lo que no se entiende se descarta en vez de romper la pantalla.
 */
export function normalizarPromedio(crudo: unknown): DatosPromedio {
  const raiz = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  const e = (raiz.escala && typeof raiz.escala === "object" ? raiz.escala : {}) as Record<string, unknown>;
  const maximo = acotar(numero(e.maximo) ?? ESCALA_DIEZ.maximo, 1, 1000);
  const escala: Escala = { maximo, minimoAprobatorio: acotar(numero(e.minimoAprobatorio) ?? (maximo === 100 ? 70 : 6), 0, maximo) };

  const ids = new Set<string>();
  const unico = (id: unknown, respaldo: string): string => {
    let candidato = typeof id === "string" && id.trim() ? id.trim().slice(0, 40) : respaldo;
    while (ids.has(candidato)) candidato += "_";
    ids.add(candidato);
    return candidato;
  };

  const materias: Materia[] = [];
  for (const m of Array.isArray(raiz.materias) ? raiz.materias : []) {
    if (materias.length >= MAX_MATERIAS) break;
    if (!m || typeof m !== "object") continue;
    const mm = m as Record<string, unknown>;
    if (typeof mm.nombre !== "string" || !mm.nombre.trim()) continue;
    const evaluaciones: Evaluacion[] = [];
    for (const ev of Array.isArray(mm.evaluaciones) ? mm.evaluaciones : []) {
      if (evaluaciones.length >= MAX_EVALUACIONES) break;
      if (!ev || typeof ev !== "object") continue;
      const x = ev as Record<string, unknown>;
      const peso = numero(x.peso);
      if (peso === null) continue;
      const cal = numero(x.calificacion);
      evaluaciones.push({
        id: unico(x.id, `e${ids.size}`),
        nombre: typeof x.nombre === "string" ? x.nombre.slice(0, 60) : "",
        peso: acotar(peso, 0, 100),
        calificacion: cal === null ? null : acotar(cal, 0, escala.maximo),
      });
    }
    materias.push({
      id: unico(mm.id, `m${materias.length}`),
      nombre: mm.nombre.trim().slice(0, 60),
      creditos: acotar(numero(mm.creditos) ?? 1, 1, 20),
      evaluaciones,
    });
  }
  return { escala, materias };
}
