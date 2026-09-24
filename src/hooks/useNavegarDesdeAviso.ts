"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { esEscritorio } from "@/lib/entorno";

/**
 * Al pulsar una notificación de Windows, el programa trae la ventana al frente y avisa (evento `navegar`) a qué
 * sección ir: una clase lleva al Horario, un cumpleaños al Calendario… Solo se aceptan rutas internas.
 */
export function useNavegarDesdeAviso() {
  const router = useRouter();
  useEffect(() => {
    if (!esEscritorio()) return;
    let cancelado = false;
    let quitar: (() => void) | null = null;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const fn = await listen<string>("navegar", (e) => {
        const ruta = e.payload;
        if (typeof ruta === "string" && ruta.startsWith("/") && !ruta.startsWith("//")) router.push(ruta);
      });
      if (cancelado) fn();
      else quitar = fn;
    });
    return () => {
      cancelado = true;
      quitar?.();
    };
  }, [router]);
}
