import { claveFecha, eventoOcurreEn, type Repeticion } from "./fechas";

/**
 * Avisar de un evento con hora («Examen de física, 08:30») unos minutos antes de que empiece, no solo el día anterior o esa
 * mañana. Lógica pura: dado el momento de ahora, dice qué eventos empiezan dentro del margen elegido.
 */

export interface EventoConHora {
  id: string;
  titulo: string;
  /** Fecha de la primera ocurrencia, «AAAA-MM-DD». */
  fecha: string;
  /** «HH:MM», o null si es de todo el día (esos no se avisan con hora). */
  hora: string | null;
  repetir: Repeticion;
  avisar: boolean;
}

export interface AvisoDeHora<E extends EventoConHora = EventoConHora> {
  evento: E;
  /** Minutos que faltan para que empiece (1 o más). */
  faltan: number;
  /** Identifica ESTA ocurrencia: sirve para avisar una sola vez. */
  clave: string;
}

/** Los minutos que tiene un «HH:MM», o null si no es una hora. */
export function minutosDeHoraTexto(hhmm: string | null): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Los eventos de hoy que empiezan dentro de `margenMin` minutos (y todavía no empezaron). Con margen 0 no se avisa de nada.
 * Los eventos ya empezados, los de todo el día y los que tienen el aviso apagado quedan fuera.
 */
export function eventosPorAvisarDeHora<E extends EventoConHora>(eventos: readonly E[], ahora: Date, margenMin: number): AvisoDeHora<E>[] {
  if (margenMin <= 0) return [];
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const salida: AvisoDeHora<E>[] = [];
  for (const evento of eventos) {
    if (!evento.avisar) continue;
    const inicio = minutosDeHoraTexto(evento.hora);
    if (inicio === null) continue;
    if (!eventoOcurreEn(evento.fecha, evento.repetir, ahora)) continue;
    const faltan = inicio - minAhora;
    if (faltan < 1 || faltan > margenMin) continue;
    salida.push({ evento, faltan, clave: `evento-hora:${evento.id}|${claveFecha(ahora)}|${evento.hora}` });
  }
  return salida.sort((a, b) => a.faltan - b.faltan);
}
