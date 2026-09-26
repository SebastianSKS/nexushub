"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";
import { compararVersiones, novedadesEntre } from "@/lib/novedades";
import { useGuiasStore } from "@/store/guias-store";
import { guardarVersionVista, leerVersionVista, useNovedadesStore } from "@/store/novedades-store";

/** Con la que se supone que empezó quien ya usaba Nexo antes de que existiera este cuadro (la primera versión). */
const VERSION_ANTERIOR = "0.1.0";

/**
 * Después de actualizar, la primera vez que se abre Nexo muestra qué cambió desde la versión que se tenía.
 * A quien instala Nexo por primera vez no le muestra nada (para eso está la bienvenida) y solo anota su versión.
 * Espera a que no haya una guía a la vista para no apilar cuadros.
 */
export function useNovedades() {
  const cargado = useGuiasStore((s) => s.cargado);
  const vistas = useGuiasStore((s) => s.vistas);
  const guiaAbierta = useGuiasStore((s) => s.abierta);

  useEffect(() => {
    if (!esEscritorio() || !cargado || guiaAbierta || useNovedadesStore.getState().abiertas) return;
    let cancelado = false;
    void (async () => {
      const { getVersion } = await import("@tauri-apps/api/app");
      const actual = await getVersion();
      if (cancelado) return;
      const guardada = leerVersionVista();
      if (!guardada && !vistas.includes("bienvenida")) {
        // Instalación nueva: se muestra la bienvenida, no las novedades.
        guardarVersionVista(actual);
        return;
      }
      const base = guardada ?? VERSION_ANTERIOR;
      if (compararVersiones(actual, base) <= 0) {
        if (guardada !== actual && compararVersiones(actual, base) === 0) guardarVersionVista(actual);
        return;
      }
      const lista = novedadesEntre(base, actual);
      if (lista.length === 0) {
        guardarVersionVista(actual); // versión sin nada que contar
        return;
      }
      // Un instante para que la ventana termine de dibujarse.
      window.setTimeout(() => !cancelado && useNovedadesStore.getState().abrir(lista, actual), 600);
    })();
    return () => {
      cancelado = true;
    };
  }, [cargado, vistas, guiaAbierta]);
}
