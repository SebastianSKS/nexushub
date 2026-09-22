"use client";

import { useEffect, useState } from "react";

interface NavigationApi {
  canGoBack: boolean;
  canGoForward: boolean;
  addEventListener: (t: "currententrychange", cb: () => void) => void;
  removeEventListener: (t: "currententrychange", cb: () => void) => void;
}

/**
 * ¿Hay a dónde regresar / avanzar en el historial? Se apoya en la Navigation API de Chromium
 * (WebView2 y Edge/Chrome la incluyen). Si el motor no la tiene, ambos botones quedan activos
 * en vez de fingir un estado que no se puede conocer.
 */
export function useHistorial() {
  const [estado, setEstado] = useState({ puedeAtras: false, puedeAdelante: false });

  useEffect(() => {
    const nav = (window as unknown as { navigation?: NavigationApi }).navigation;
    if (!nav) {
      setEstado({ puedeAtras: true, puedeAdelante: true });
      return;
    }
    // Diferido: Next actualiza el historial dentro de un useInsertionEffect, donde React no admite setState.
    const actualizar = () => queueMicrotask(() => setEstado({ puedeAtras: nav.canGoBack, puedeAdelante: nav.canGoForward }));
    actualizar();
    nav.addEventListener("currententrychange", actualizar);
    return () => nav.removeEventListener("currententrychange", actualizar);
  }, []);

  return estado;
}
