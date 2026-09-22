"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { normalizarRuta, rutaValida } from "@/lib/rutas";

export const CLAVE_ULTIMA_RUTA = "nexushub-ultima-ruta";

/** Recuerda la última ruta visitada para restaurarla al abrir la aplicación. */
export function MemoriaSesion() {
  const pathname = usePathname();

  useEffect(() => {
    const ruta = normalizarRuta(pathname);
    if (ruta === "/") return; // la raíz solo redirige; no es una sección
    try {
      window.localStorage.setItem(CLAVE_ULTIMA_RUTA, ruta + window.location.search);
    } catch {
      /* almacenamiento bloqueado: simplemente no se recuerda */
    }
  }, [pathname]);

  return null;
}

/** Última ruta guardada, solo si sigue existiendo (una ruta vieja podría haber desaparecido en una versión nueva). */
export function leerUltimaRuta(): string | null {
  try {
    const guardada = window.localStorage.getItem(CLAVE_ULTIMA_RUTA);
    return guardada && rutaValida(guardada) ? guardada : null;
  } catch {
    return null;
  }
}
