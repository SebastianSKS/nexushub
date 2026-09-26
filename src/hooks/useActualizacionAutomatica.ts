"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";
import { useActualizacionesStore } from "@/store/actualizaciones-store";

/** Unos segundos después de abrir (para no competir con el arranque) y luego cada pocas horas, mira en silencio si hay una versión nueva. */
const PRIMERA_VEZ_MS = 12_000;
const CADA_MS = 6 * 60 * 60 * 1000;

export function useActualizacionAutomatica() {
  useEffect(() => {
    if (!esEscritorio()) return;
    const buscar = () => void useActualizacionesStore.getState().buscar(true);
    const primera = window.setTimeout(buscar, PRIMERA_VEZ_MS);
    const repetir = window.setInterval(buscar, CADA_MS);
    return () => {
      window.clearTimeout(primera);
      window.clearInterval(repetir);
    };
  }, []);
}
