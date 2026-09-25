"use client";

import { useEffect } from "react";
import { notificarSistema } from "@/lib/notificar";
import { useAjustesStore } from "@/store/ajustes-store";
import { useReproductorStore } from "@/store/reproductor-store";


/**
 * Con el ajuste «avisarCambioCancion» activo, avisa con una notificación del sistema cada vez que
 * empieza a sonar una canción nueva (una por pista, aunque se repita o se pause y reanude).
 */
export function useAvisoCancion() {
  useEffect(() => {
    const avisadas = new Set<string>();
    return useReproductorStore.subscribe((s) => {
      if (!s.pista || !s.reproduciendo) return;
      const clave = `${s.fuente}:${s.pista.id}`;
      if (avisadas.has(clave)) return;
      avisadas.add(clave);
      if (!useAjustesStore.getState().avisarCambioCancion) return;
      notificarSistema(s.pista.titulo, s.pista.artista || "Nexo", `cancion:${clave}`, "/musica");
    });
  }, []);
}
