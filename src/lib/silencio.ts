/**
 * «No molestar»: horas en las que Nexo no manda notificaciones del sistema (ni suena). Se elige de una hora a otra y puede
 * cruzar la medianoche (de 22:00 a 07:00). Las horas van de 0 a 23; si «desde» y «hasta» son la misma, no se silencia nada
 * (sería todo el día o ninguno, y para eso está el interruptor).
 */

export interface HorasDeSilencio {
  activo: boolean;
  /** Hora (0–23) en la que empieza el silencio. */
  desde: number;
  /** Hora (0–23) en la que termina (a esa hora ya vuelven los avisos). */
  hasta: number;
}

export const SILENCIO_PREDETERMINADO: HorasDeSilencio = { activo: false, desde: 22, hasta: 7 };

/** Una hora válida (entero de 0 a 23) o el valor de reserva. */
export function horaValida(x: unknown, reserva: number): number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 23 ? x : reserva;
}

/** ¿A esta hora y minuto, Nexo debe callarse? */
export function enHorasDeSilencio(ahora: Date, c: HorasDeSilencio): boolean {
  if (!c.activo || c.desde === c.hasta) return false;
  const h = ahora.getHours();
  return c.desde < c.hasta ? h >= c.desde && h < c.hasta : h >= c.desde || h < c.hasta;
}

/** «22:00» para mostrar. */
export const textoDeHora = (h: number): string => `${String(h).padStart(2, "0")}:00`;
