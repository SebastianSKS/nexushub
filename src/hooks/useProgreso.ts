"use client";

import { useEffect, useState } from "react";
import { progresoActual, useReproductorStore } from "@/store/reproductor-store";

/** Segundos actuales de la pista, refrescados 4 veces por segundo mientras suena. */
export function useProgreso(): number {
  const [v, setV] = useState(() => progresoActual(useReproductorStore.getState()));
  useEffect(() => {
    const leer = () => setV(progresoActual(useReproductorStore.getState()));
    leer();
    const id = setInterval(leer, 250);
    const off = useReproductorStore.subscribe(leer);
    return () => {
      clearInterval(id);
      off();
    };
  }, []);
  return v;
}
