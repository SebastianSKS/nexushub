"use client";

import { useEffect, useState } from "react";

/**
 * La hora de ahora, que se actualiza sola cada `cadaMs` (30 s por defecto: alcanza para «empieza en 45 min»). Es `null` hasta
 * que la ventana se dibuja: la hora no se puede calcular al generar la página, o el HTML no coincidiría con lo que se dibuja.
 * Se detiene mientras la ventana está oculta (en la bandeja) para no gastar batería, y se pone al día al volver.
 */
export function useAhora(cadaMs = 30_000): Date | null {
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    let id: number | undefined;
    const arrancar = () => {
      if (id !== undefined) return;
      id = window.setInterval(() => setAhora(new Date()), cadaMs);
    };
    const parar = () => {
      if (id !== undefined) window.clearInterval(id);
      id = undefined;
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") {
        setAhora(new Date());
        arrancar();
      } else parar();
    };
    if (document.visibilityState === "visible") arrancar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      parar();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [cadaMs]);

  return ahora;
}
