import type { FormatoHora } from "./ajustes-base.ts";

/** Cómo se escriben la mañana y la tarde en el formato de 12 horas. */
export interface MarcasHora {
  am: string;
  pm: string;
}

export const MARCAS_ES: MarcasHora = { am: "a. m.", pm: "p. m." };
export const MARCAS_EN: MarcasHora = { am: "AM", pm: "PM" };

const PATRON = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Una hora «HH:MM» (24 h, como se guarda) escrita como la quiere quien la lee: en 24 horas queda igual («14:30») y en 12
 * horas pasa a «2:30 p. m.». Lo que no sea una hora se devuelve tal cual, para no esconder un dato raro.
 */
export function formatearHora(hhmm: string, formato: FormatoHora, marcas: MarcasHora = MARCAS_ES): string {
  const m = PATRON.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  if (formato === "24h") return `${String(h).padStart(2, "0")}:${m[2]}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${h < 12 ? marcas.am : marcas.pm}`;
}

/** Una hora en punto (0–23), por ejemplo para las listas de horas: «07:00» o «7:00 a. m.». */
export function horaEnPunto(h: number, formato: FormatoHora, marcas: MarcasHora = MARCAS_ES): string {
  return formatearHora(`${String(h).padStart(2, "0")}:00`, formato, marcas);
}
