"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";
import { useReproductorStore } from "@/store/reproductor-store";

/**
 * Sincroniza la bandeja del sistema (icono, menú y tooltip) con lo que suena, y escucha sus dos
 * acciones (Reproducir/Pausar, Siguiente) para aplicarlas sobre el reproductor real. Solo en escritorio.
 */
export function useBandeja() {
  useEffect(() => {
    if (!esEscritorio()) return;
    let cancelado = false;
    let clave = ""; // evita invocar a Rust en cada segundo de progreso: solo cuando algo relevante cambia
    const quitar: (() => void)[] = [];

    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");

      const actualizar = () => {
        const s = useReproductorStore.getState();
        const siguienteActivo = s.pista !== null && (s.capacidades.saltar || s.cola.length > 1);
        const actual = `${s.reproduciendo}|${s.pista?.id ?? ""}|${s.pista?.fuente ?? ""}|${siguienteActivo}`;
        if (actual === clave) return;
        clave = actual;
        void invoke("actualizar_bandeja", {
          reproduciendo: s.reproduciendo,
          hayPista: s.pista !== null,
          siguienteActivo,
          titulo: s.pista ? `${s.pista.titulo} · ${s.pista.artista}` : null,
        }).catch(() => {});
      };

      actualizar();
      quitar.push(useReproductorStore.subscribe(actualizar));
      quitar.push(await listen("bandeja-alternar", () => useReproductorStore.getState().alternar()));
      quitar.push(await listen("bandeja-siguiente", () => useReproductorStore.getState().siguiente()));

      if (cancelado) quitar.splice(0).forEach((fn) => fn());
    })();

    return () => {
      cancelado = true;
      quitar.splice(0).forEach((fn) => fn());
    };
  }, []);
}
