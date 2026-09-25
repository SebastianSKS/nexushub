"use client";

import { useEffect, useRef } from "react";
import { esEscritorio } from "@/lib/entorno";
import { borrarIndice, sincronizarIndice } from "@/services/indice-pdfs";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * Mantiene al día el índice de los PDF de tus carpetas (para buscar dentro de ellos con Ctrl+K): unos segundos después de
 * abrir Nexo —para no competir con el arranque— y cada vez que vuelves a la ventana (por si guardaste PDF desde fuera).
 * Al apagar el ajuste, el índice se borra.
 */
export function useIndicePdfsAutomatico() {
  const cargado = useAjustesStore((s) => s.cargado);
  const activo = useAjustesStore((s) => s.buscarEnPdfs);
  const antes = useRef<boolean | null>(null);

  useEffect(() => {
    if (!cargado || !esEscritorio()) return;
    const estabaActivo = antes.current;
    antes.current = activo;
    if (!activo) {
      if (estabaActivo) void borrarIndice();
      return;
    }
    const espera = window.setTimeout(() => void sincronizarIndice(), estabaActivo === null ? 8000 : 500);
    const alVolver = () => void sincronizarIndice(120_000);
    window.addEventListener("focus", alVolver);
    return () => {
      window.clearTimeout(espera);
      window.removeEventListener("focus", alVolver);
    };
  }, [cargado, activo]);
}
