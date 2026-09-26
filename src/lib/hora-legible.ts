import { horaEnPunto, formatearHora, MARCAS_EN, MARCAS_ES } from "@/lib/hora";
import { useIdiomaStore } from "@/lib/i18n";
import { useAjustesStore } from "@/store/ajustes-store";

const marcas = () => (useIdiomaStore.getState().idioma === "en" ? MARCAS_EN : MARCAS_ES);

/** Una hora «HH:MM» escrita como se eligió en Configuración (24 h o 12 h) y en el idioma de ahora. Para código que no es un componente. */
export const horaLegible = (hhmm: string): string => formatearHora(hhmm, useAjustesStore.getState().formatoHora, marcas());

/** Una hora en punto (0–23) escrita igual. */
export const horaEnPuntoLegible = (h: number): string => horaEnPunto(h, useAjustesStore.getState().formatoHora, marcas());
