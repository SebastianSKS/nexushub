"use client";

import { useEffect, useState } from "react";

/** Color dominante (vivo, no gris) de una carátula, para teñir el fondo de «Reproduciendo ahora». null mientras se calcula o si no se puede leer. */
export function useColorCaratula(url: string): [number, number, number] | null {
  const [color, setColor] = useState<[number, number, number] | null>(null);
  useEffect(() => {
    setColor(null);
    if (!url) return;
    let cancelado = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 24, 24);
        const d = g.getImageData(0, 0, 24, 24).data;
        let r = 0;
        let gg = 0;
        let b = 0;
        let peso = 0;
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i]!, d[i + 1]!, d[i + 2]!);
          const mn = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
          const w = 0.15 + (mx - mn) / 255 + (mx > 40 && mx < 235 ? 0.3 : 0); // más peso a lo colorido y ni muy oscuro ni quemado
          r += d[i]! * w;
          gg += d[i + 1]! * w;
          b += d[i + 2]! * w;
          peso += w;
        }
        if (!cancelado && peso > 0) setColor([Math.round(r / peso), Math.round(gg / peso), Math.round(b / peso)]);
      } catch {
        /* imagen sin permiso de lectura: se queda el fondo de siempre */
      }
    };
    img.src = url;
    return () => {
      cancelado = true;
    };
  }, [url]);
  return color;
}
