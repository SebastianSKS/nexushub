"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { guiaDeRuta } from "@/lib/guias";
import { useGuiasStore } from "@/store/guias-store";

/**
 * Muestra las guías solas, una sola vez cada una:
 * - la primera vez que se abre Nexo en este equipo, la bienvenida;
 * - después, la explicación de cada sección la primera vez que se entra a ella.
 * Lo que ya se vio queda guardado (y en la copia de respaldo), así que una actualización o un cierre raro no las repite.
 */
export function useGuiasAutomaticas() {
  const ruta = usePathname();
  const cargado = useGuiasStore((s) => s.cargado);
  const vistas = useGuiasStore((s) => s.vistas);
  const abierta = useGuiasStore((s) => s.abierta);
  /** La pantalla en la que se acaba de cerrar la bienvenida: ahí no se apila otra guía encima. */
  const silenciada = useRef<string | null>(null);
  const habiaBienvenida = useRef(false);

  useEffect(() => useGuiasStore.getState().cargar(), []);

  useEffect(() => {
    if (abierta === "bienvenida") habiaBienvenida.current = true;
    else if (habiaBienvenida.current) {
      habiaBienvenida.current = false;
      silenciada.current = ruta;
    }
  }, [abierta, ruta]);

  useEffect(() => {
    if (!cargado || abierta) return;
    const { abrir } = useGuiasStore.getState();
    // Un instante para que la pantalla termine de dibujarse antes de poner la guía encima.
    if (!vistas.includes("bienvenida")) {
      const t = setTimeout(() => abrir("bienvenida"), 300);
      return () => clearTimeout(t);
    }
    const id = guiaDeRuta(ruta);
    if (!id || id === "bienvenida" || vistas.includes(id) || silenciada.current === ruta) return;
    const t = setTimeout(() => abrir(id), 250);
    return () => clearTimeout(t);
  }, [cargado, vistas, abierta, ruta]);
}
