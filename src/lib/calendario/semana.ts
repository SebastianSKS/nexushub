import type { PrimerDiaSemana } from "../ajustes-base.ts";

/**
 * Las cuentas de semanas del calendario, con la semana empezando en lunes o en domingo (como se elija en Configuración).
 * Lógica de fechas pura: los nombres de los días y meses están en `fechas.ts`.
 */

/** Cuántos días hay que retroceder desde `diaSemana` (0 = domingo … 6 = sábado, como `Date.getDay`) para llegar al primer día de su semana. */
export const desfaseDeSemana = (diaSemana: number, primer: PrimerDiaSemana): number => (primer === "lunes" ? (diaSemana + 6) % 7 : diaSemana);

/** Las 6 semanas (42 días) que se dibujan para un mes (`mes` de 1 a 12), empezando el día que se elija. */
export function diasDelMes(anio: number, mes: number, primer: PrimerDiaSemana = "lunes"): { fecha: Date; delMes: boolean }[] {
  const primero = new Date(anio, mes - 1, 1);
  const desfase = desfaseDeSemana(primero.getDay(), primer);
  return Array.from({ length: 42 }, (_, i) => {
    const fecha = new Date(anio, mes - 1, 1 - desfase + i);
    return { fecha, delMes: fecha.getMonth() === mes - 1 };
  });
}

/** Los 7 días de la semana que contiene `fecha`, empezando el día que se elija. */
export function diasDeLaSemana(fecha: Date, primer: PrimerDiaSemana = "lunes"): Date[] {
  const f = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const desfase = desfaseDeSemana(f.getDay(), primer);
  return Array.from({ length: 7 }, (_, i) => new Date(f.getFullYear(), f.getMonth(), f.getDate() - desfase + i));
}

/** El orden en que van los días en el encabezado, como posiciones de la lista lunes-a-domingo (0 = lunes … 6 = domingo). */
export const ordenDeDias = (primer: PrimerDiaSemana): number[] => (primer === "lunes" ? [0, 1, 2, 3, 4, 5, 6] : [6, 0, 1, 2, 3, 4, 5]);
