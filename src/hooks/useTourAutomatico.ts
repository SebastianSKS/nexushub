"use client";

import { useEffect } from "react";
import { CLAVE_TOUR_VISTO } from "@/components/shell/TourBienvenida";
import { useAppStore } from "@/store/app-store";

/** La primera vez que se abre NexusHub (nunca se vio el recorrido en este equipo), lo muestra solo. */
export function useTourAutomatico() {
  useEffect(() => {
    let visto = true;
    try {
      visto = window.localStorage.getItem(CLAVE_TOUR_VISTO) === "1";
    } catch {
      /* almacenamiento bloqueado: no se insiste con el recorrido */
    }
    if (visto) return;
    // Un respiro para que la ventana termine de dibujarse antes de mostrar el recorrido encima.
    const t = setTimeout(() => useAppStore.getState().setTourAbierto(true), 500);
    return () => clearTimeout(t);
  }, []);
}
