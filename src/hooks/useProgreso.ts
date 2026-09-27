"use client";

import { useEffect, useState } from "react";
import { progresoActual, useReproductorStore } from "@/store/reproductor-store";

/**
 * Segundos actuales de la pista, refrescados 4 veces por segundo, pero solo mientras suena y la ventana se ve: en pausa o
 * con la ventana en la bandeja no hay nada que animar, y así no se despierta el procesador (importa en equipos modestos).
 */
export function useProgreso(): number {
  const [v, setV] = useState(() => progresoActual(useReproductorStore.getState()));
  useEffect(() => {
    const leer = () => setV(progresoActual(useReproductorStore.getState()));
    let id: number | undefined;
    const ajustar = () => {
      const debeCorrer = useReproductorStore.getState().reproduciendo && document.visibilityState === "visible";
      if (debeCorrer && id === undefined) id = window.setInterval(leer, 250);
      else if (!debeCorrer && id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const alCambiar = () => {
      leer();
      ajustar();
    };
    alCambiar();
    const off = useReproductorStore.subscribe(alCambiar);
    document.addEventListener("visibilitychange", alCambiar);
    return () => {
      if (id !== undefined) window.clearInterval(id);
      off();
      document.removeEventListener("visibilitychange", alCambiar);
    };
  }, []);
  return v;
}
