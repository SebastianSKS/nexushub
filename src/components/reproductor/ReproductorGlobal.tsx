"use client";

import { useEffect, useRef } from "react";
import { useAdaptadorSpotify } from "@/hooks/useAdaptadorSpotify";
import { useAdaptadorYouTube } from "@/hooks/useAdaptadorYouTube";
import { useMediaSession } from "@/hooks/useMediaSession";
import { registrarAlternar } from "@/lib/playback";
import { obtenerReproductor } from "@/services/canales/youtube-iframe";
import { useAppStore } from "@/store/app-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { ContenedorVideo } from "./ContenedorVideo";

/**
 * Se monta UNA vez, en la raíz (Ventana). Nada que produzca sonido o video vive en las páginas: por eso
 * cambiar de sección no puede cortar la reproducción. Contiene los adaptadores de las dos fuentes, el
 * contenedor fijo del video y el «anfitrión» oculto del embed de Spotify. (La barra de música se dibuja
 * aparte, en el flujo de la ventana, para que el contenido se encoja.)
 */
export function ReproductorGlobal() {
  const hostYoutube = useRef<HTMLDivElement>(null);
  const hostSpotify = useRef<HTMLDivElement>(null);

  useAdaptadorYouTube(hostYoutube);
  useAdaptadorSpotify(hostSpotify);
  useMediaSession();

  // Solo en desarrollo: permite inspeccionar el estado desde la consola del navegador.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as { __reproductor?: typeof useReproductorStore; __yt?: typeof obtenerReproductor };
      w.__reproductor = useReproductorStore;
      w.__yt = obtenerReproductor;
    }
  }, []);

  // Espacio (atajo global) → alternar.
  useEffect(() => {
    registrarAlternar(() => {
      const s = useReproductorStore.getState();
      if (!s.pista) return false;
      s.alternar();
      return true;
    });
    return () => registrarAlternar(null);
  }, []);

  // Barra de estado: qué suena.
  const pista = useReproductorStore((s) => s.pista);
  const fuente = useReproductorStore((s) => s.fuente);
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);
  useEffect(() => {
    useAppStore.getState().setNowPlaying(pista && reproduciendo && fuente ? { kind: fuente === "youtube" ? "video" : "music", title: pista.titulo, subtitle: pista.artista } : null);
  }, [pista, fuente, reproduciendo]);

  return (
    <>
      <ContenedorVideo hostRef={hostYoutube} />
      {/* Anfitrión del embed de Spotify: fuera de pantalla (no display:none, o el navegador pausaría el audio). */}
      <div ref={hostSpotify} aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 h-[152px] w-[300px] overflow-hidden" />
    </>
  );
}
