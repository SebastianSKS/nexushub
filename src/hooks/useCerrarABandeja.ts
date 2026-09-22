"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * Con el ajuste «segundoPlano» activo, cerrar la ventana (la «x» o Alt+F4) la oculta a la bandeja
 * del sistema en vez de cerrar NexusHub, para que la música siga sonando. Para salir de verdad está
 * «Salir» en el menú de la bandeja. Se lee el ajuste en el momento del cierre, no al montar el hook,
 * así que cambiarlo en Configuración se aplica sin tener que reabrir la aplicación.
 */
export function useCerrarABandeja() {
  useEffect(() => {
    if (!esEscritorio()) return;
    let cancelado = false;
    let quitar: (() => void) | undefined;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      const fn = await w.onCloseRequested(async (evento) => {
        if (!useAjustesStore.getState().segundoPlano) return; // se deja cerrar como cualquier ventana
        evento.preventDefault();
        await w.hide();
      });
      if (cancelado) fn();
      else quitar = fn;
    })();

    return () => {
      cancelado = true;
      quitar?.();
    };
  }, []);
}
