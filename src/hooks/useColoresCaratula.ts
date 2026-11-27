"use client";

import { useEffect, useState } from "react";
import { paletaDe, type Rgb } from "@/lib/paleta";

type Colores = [Rgb, Rgb, Rgb];

/** Las portadas ya leídas en esta sesión (volver a una canción no la procesa otra vez). */
const leidas = new Map<string, Colores | null>();

/**
 * Los tres colores de una portada. Mientras se lee la siguiente se conservan los anteriores, para que el fondo pase de
 * unos a otros sin apagarse. null sin portada, o si no se puede leer.
 */
export function useColoresCaratula(url: string): Colores | null {
  const [colores, setColores] = useState<Colores | null>(null);

  useEffect(() => {
    if (!url) return setColores(null);
    if (leidas.has(url)) return setColores(leidas.get(url)!);
    let cancelado = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let nuevos: Colores | null = null;
      try {
        const lienzo = document.createElement("canvas");
        lienzo.width = lienzo.height = 32;
        const g = lienzo.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 32, 32);
        nuevos = paletaDe(g.getImageData(0, 0, 32, 32).data);
      } catch {
        /* imagen sin permiso de lectura: se queda el fondo de siempre */
      }
      leidas.set(url, nuevos);
      if (!cancelado) setColores(nuevos);
    };
    img.onerror = () => {
      if (!cancelado) setColores(null);
    };
    img.src = url;
    return () => {
      cancelado = true;
    };
  }, [url]);

  return colores;
}
