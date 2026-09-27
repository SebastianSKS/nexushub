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

/** Añade una materia al final. Si ya hay el máximo permitido, no añade nada. */
export function conMateriaNueva(datos: DatosPromedio, materia: Materia): DatosPromedio {
  if (datos.materias.length >= MAX_MATERIAS) return datos;
  return { ...datos, materias: [...datos.materias, materia] };
}

/** Quita una materia y todas sus evaluaciones. */
export function sinMateria(datos: DatosPromedio, id: string): DatosPromedio {
  return { ...datos, materias: datos.materias.filter((m) => m.id !== id) };
}

/** Cambia el nombre o los créditos de una materia (lo demás no se toca desde aquí). */
export function conMateriaCambiada(datos: DatosPromedio, id: string, cambios: Partial<Pick<Materia, "nombre" | "creditos">>): DatosPromedio {
  return {
    ...datos,
    materias: datos.materias.map((m) =>
      m.id !== id
        ? m
        : {
            ...m,
            nombre: cambios.nombre !== undefined ? cambios.nombre.slice(0, 60) : m.nombre,
            creditos: cambios.creditos !== undefined ? Math.min(20, Math.max(1, Math.round(cambios.creditos) || 1)) : m.creditos,
          },
    ),
  };
}
