"use client";

import { useEffect } from "react";
import { useReproductorStore } from "@/store/reproductor-store";

/**
 * Integra la reproducción con el sistema (teclas multimedia, superposición de volumen de Windows).
 * Chromium/WebView2 publica esta sesión hacia Windows (SMTC). Ojo: cuando el sonido lo produce un iframe
 * de otro origen (YouTube, Spotify), es el navegador quien decide qué sesión muestra; por eso esto hay que
 * comprobarlo en la aplicación compilada, fuente por fuente.
 */
export function useMediaSession() {
  const pista = useReproductorStore((s) => s.pista);
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);
  const capacidades = useReproductorStore((s) => s.capacidades);
  const hayCola = useReproductorStore((s) => s.cola.length > 1);
  const duracion = pista?.duracion ?? 0;

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!pista) {
      ms.metadata = null;
      ms.playbackState = "none";
      return;
    }
    ms.metadata = new MediaMetadata({
      title: pista.titulo,
      artist: pista.artista,
      album: "NexusHub",
      artwork: pista.caratula ? [{ src: pista.caratula, sizes: "480x360" }] : [],
    });
  }, [pista]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = pista ? (reproduciendo ? "playing" : "paused") : "none";
  }, [pista, reproduciendo]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !pista || duracion <= 0) return;
    try {
      const s = useReproductorStore.getState();
      navigator.mediaSession.setPositionState({ duration: duracion, position: Math.min(s.progreso, duracion), playbackRate: 1 });
    } catch {
      /* valores fuera de rango durante la carga */
    }
  }, [pista, duracion, reproduciendo]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const st = useReproductorStore.getState;
    const poner = (accion: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(accion, fn);
      } catch {
        /* acción no soportada por este navegador */
      }
    };
    poner("play", () => st().alternar());
    poner("pause", () => st().alternar());
    const saltar = capacidades.saltar || hayCola;
    poner("previoustrack", saltar ? () => st().anterior() : null);
    poner("nexttrack", saltar ? () => st().siguiente() : null);
    poner("seekto", capacidades.buscar ? (d) => d.seekTime !== undefined && st().buscar(d.seekTime) : null);
    return () => {
      poner("play", null);
      poner("pause", null);
      poner("previoustrack", null);
      poner("nexttrack", null);
      poner("seekto", null);
    };
  }, [capacidades, hayCola]);
}
