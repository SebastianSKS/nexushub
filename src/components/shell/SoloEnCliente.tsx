"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Dibuja su contenido solo en el navegador. Sirve para pantallas que dependen de «qué día es hoy» (el calendario):
 * la página se genera de antemano, con la fecha de ese momento, y al abrirla otro día lo dibujado no coincidiría
 * con lo generado (React lo avisa como un error de «hidratación»).
 */
export function SoloEnCliente({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  useEffect(() => setListo(true), []);
  return listo ? children : null;
}
