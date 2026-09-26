"use client";

import { useCallback } from "react";
import { formatearHora, horaEnPunto, MARCAS_EN, MARCAS_ES } from "@/lib/hora";
import { useIdioma } from "@/lib/i18n";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * Las funciones para escribir horas como se eligió en Configuración (24 h o 12 h), en el idioma de ahora. Al cambiar el
 * formato o el idioma, quien las usa se vuelve a dibujar solo.
 */
export function useHora() {
  const formato = useAjustesStore((s) => s.formatoHora);
  const marcas = useIdioma() === "en" ? MARCAS_EN : MARCAS_ES;
  const hora = useCallback((hhmm: string) => formatearHora(hhmm, formato, marcas), [formato, marcas]);
  const enPunto = useCallback((h: number) => horaEnPunto(h, formato, marcas), [formato, marcas]);
  return { hora, enPunto };
}
