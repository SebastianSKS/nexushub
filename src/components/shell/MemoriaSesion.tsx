"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { esRutaDeAjustes, normalizarRuta, RUTA_INICIAL, rutaValida, SECCIONES } from "@/lib/rutas";
import { useNavStore } from "@/store/nav-store";
import { leerSeccionInicial } from "@/store/ajustes-store";

export const CLAVE_ULTIMA_RUTA = "nexushub-ultima-ruta";

/** Recuerda la última ruta visitada: para restaurarla al abrir y para regresar a ella al salir de Configuración. */
export function MemoriaSesion() {
  // useSearchParams exige una frontera Suspense en la exportación estática.
  return (
    <Suspense fallback={null}>
      <Recordador />
    </Suspense>
  );
}

function Recordador() {
  const pathname = usePathname();
  const consulta = useSearchParams().toString();

  useEffect(() => {
    const ruta = normalizarRuta(pathname);
    if (ruta === "/") return; // la raíz solo redirige; no es una sección
    const completa = consulta ? `${ruta}?${consulta}` : ruta;
    if (rutaValida(completa) && !esRutaDeAjustes(completa)) useNavStore.getState().recordar(completa);
    try {
      window.localStorage.setItem(CLAVE_ULTIMA_RUTA, completa);
    } catch {
      /* almacenamiento bloqueado: simplemente no se recuerda */
    }
  }, [pathname, consulta]);

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

/** Adónde va Nexo al abrirse: por defecto Inicio (la bienvenida); o la sección fija o la última usada, según lo elegido. */
export function rutaDeInicio(): string {
  const elegida = leerSeccionInicial();
  if (elegida !== "ultima") return SECCIONES.find((s) => s.id === elegida)?.ruta ?? RUTA_INICIAL;
  return leerUltimaRuta() ?? RUTA_INICIAL;
}
