"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * El tamaño de toda la interfaz (90 %, 100 %, 110 %…), como el zoom del navegador pero elegido en Configuración y recordado.
 * Se aplica con el zoom de la propia ventana, así el diseño se recalcula bien (los cuadros, las barras y los menús). Solo en
 * la aplicación de escritorio.
 */
export function useZoomInterfaz() {
  const cargado = useAjustesStore((s) => s.cargado);
  const zoom = useAjustesStore((s) => s.zoomInterfaz);

  useEffect(() => {
    if (!cargado || !esEscritorio()) return;
    let cancelado = false;
    void import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) => (cancelado ? undefined : getCurrentWebview().setZoom(zoom / 100)))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [cargado, zoom]);
}
