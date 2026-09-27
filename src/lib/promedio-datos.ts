/**
 * Cambios sobre los datos del promedio, como funciones puras: reciben los datos y devuelven unos nuevos, sin tocar los originales.
 * La pantalla y el almacenamiento los usan; aquí se prueban sin ninguno de los dos.
 */
import { acotarEscala, MAX_EVALUACIONES, MAX_MATERIAS, type DatosPromedio, type Escala, type Evaluacion, type Materia } from "./promedio";

/** Cambia la escala de calificación (y ajusta las calificaciones que quedarían fuera de ella). */
export function conEscala(datos: DatosPromedio, escala: Escala): DatosPromedio {
  const nueva = acotarEscala(escala);
  return {
    escala: nueva,
    materias: datos.materias.map((m) => ({
      ...m,
      evaluaciones: m.evaluaciones.map((e) => (e.calificacion !== null && e.calificacion > nueva.maximo ? { ...e, calificacion: nueva.maximo } : e)),
    })),
  };
}
