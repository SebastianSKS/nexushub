"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";

/** ¿El clic fue sobre algo donde escribir (campo de texto, nota, buscador)? Ahí el menú del sistema sigue sirviendo (pegar, deshacer…). */
function esEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const editable = el.closest("input, textarea, [contenteditable='true']");
  return editable !== null && !(editable as HTMLInputElement).disabled;
}

/**
 * Nexo es, por dentro, una página web (WebView2) — así que sin esto se cuela el menú del navegador
 * («Copiar», «Imprimir», «Más herramientas») y el texto de toda la interfaz se puede arrastrar y
 * seleccionar como si fuera una hoja web, con el color de acento pintando media pantalla. Solo en la
 * aplicación de escritorio: en el navegador esos comportamientos son los normales y hay que dejarlos.
 */
export function useSinMenuDeNavegador() {
  useEffect(() => {
    if (!esEscritorio()) return;
    const alMenuContextual = (e: MouseEvent) => {
      if (!esEditable(e.target)) e.preventDefault();
    };
    document.addEventListener("contextmenu", alMenuContextual);
    return () => document.removeEventListener("contextmenu", alMenuContextual);
  }, []);
}
