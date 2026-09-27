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
