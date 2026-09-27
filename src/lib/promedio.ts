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
