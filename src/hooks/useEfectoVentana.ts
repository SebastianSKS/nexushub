"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * Aplica el «Efecto de ventana» elegido en Configuración al material NATIVO de la ventana (el que
 * dibuja Windows detrás, con transparencia real). Sin esto, cambiar el ajuste solo movería el tinte
 * CSS: la ventana seguiría mostrando Mica de verdad por debajo, viniera lo que viniera elegido.
 */
export function useEfectoVentana() {
  const efecto = useAjustesStore((s) => s.efecto);

  useEffect(() => {
    if (!esEscritorio()) return;
    let cancelado = false;
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { Effect } = await import("@tauri-apps/api/window");
      if (cancelado) return;
      const win = getCurrentWindow();
      const efectos = efecto === "mica" ? [Effect.Mica] : efecto === "acrilico" ? [Effect.Acrylic] : [];
      try {
        await win.setEffects(efectos.length ? { effects: efectos } : { effects: [] });
      } catch {
        /* Windows 10 sin las actualizaciones necesarias: la ventana se queda opaca, sin más. */
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [efecto]);
}
