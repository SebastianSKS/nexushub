"use client";

import { useEffect } from "react";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useReproductorStore } from "@/store/reproductor-store";

/** Cada canción de Spotify que empieza a sonar se anota en "reproducido recientemente". */
export function useRecientesMusica() {
  useEffect(() => {
    useFavoritosStore.getState().cargar();
    let anterior: string | null = null;
    return useReproductorStore.subscribe((s) => {
      if (s.fuente !== "spotify" || !s.pista || !s.reproduciendo) return;
      const clave = `${s.fuente}:${s.pista.id}`;
      if (clave === anterior) return;
      anterior = clave;
      useFavoritosStore.getState().registrarReciente(s.pista);
    });
  }, []);
}
