import { traducir } from "@/lib/i18n";
import { partesDeDuracion } from "@/lib/dia";

/** «45 min», «1 h 20 min», «2 h»: una duración escrita en el idioma de ahora. */
export function textoDeDuracion(minutos: number): string {
  const { horas, minutos: m } = partesDeDuracion(minutos);
  if (horas === 0) return traducir("{m} min", { m });
  return m === 0 ? traducir("{h} h", { h: horas }) : traducir("{h} h {m} min", { h: horas, m });
}

/** «Hoy», «Mañana» o el día de la semana («Jueves»), para un evento que cae dentro de `dias` días (0 = hoy). */
export function textoDeCuando(dias: number, fecha: Date, nombreDia: (d: Date) => string): string {
  if (dias === 0) return traducir("Hoy");
  if (dias === 1) return traducir("Mañana");
  const n = nombreDia(fecha);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
