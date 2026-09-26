"use client";

import { useEffect, useState, type ReactNode } from "react";
import { restaurarRespaldo } from "@/hooks/useRespaldoLocal";
import { useIdiomaStore } from "@/lib/i18n";

/**
 * Antes de mostrar nada, recupera del respaldo lo que le falte al almacenamiento (ver restaurarRespaldo). Así ninguna pantalla
 * arranca con valores de fábrica que luego pisen los datos de la persona, ni se ve un instante el recorrido de bienvenida.
 * Dura milisegundos; en el navegador no hace nada.
 */
export function RespaldoPrimero({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let vivo = true;
    // Por si la recuperación tardara demasiado, la aplicación abre igual a los 3 segundos.
    const limite = setTimeout(() => {
      useIdiomaStore.getState().cargar();
      if (vivo) setListo(true);
    }, 3000);
    void restaurarRespaldo().finally(() => {
      useIdiomaStore.getState().cargar(); // el idioma elegido, antes de dibujar nada: no se ve un instante en el otro idioma
      clearTimeout(limite);
      if (vivo) setListo(true);
    });
    return () => {
      vivo = false;
      clearTimeout(limite);
    };
  }, []);
  return listo ? <>{children}</> : null;
}
