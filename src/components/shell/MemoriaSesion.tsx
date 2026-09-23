"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { normalizarRuta, RUTA_INICIAL, rutaValida, SECCIONES } from "@/lib/rutas";
import { leerSeccionInicial } from "@/store/ajustes-store";

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

/** Configuración y Atajos no son un buen sitio donde arrancar: al abrir, se prefiere una sección de trabajo. */
const NO_RESTAURAR = /^\/(configuracion|atajos)(\/|$)/;

/** Última ruta guardada, solo si sigue existiendo (una ruta vieja podría haber desaparecido en una versión nueva). */
export function leerUltimaRuta(): string | null {
  try {
    const guardada = window.localStorage.getItem(CLAVE_ULTIMA_RUTA);
    return guardada && rutaValida(guardada) && !NO_RESTAURAR.test(guardada) ? guardada : null;
  } catch {
    return null;
  }
}

/** Adónde va NexusHub al abrirse: por defecto Inicio (la bienvenida); o la sección fija o la última usada, según lo elegido. */
export function rutaDeInicio(): string {
  const elegida = leerSeccionInicial();
  if (elegida !== "ultima") return SECCIONES.find((s) => s.id === elegida)?.ruta ?? RUTA_INICIAL;
  return leerUltimaRuta() ?? RUTA_INICIAL;
}
