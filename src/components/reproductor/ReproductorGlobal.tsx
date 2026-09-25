"use client";

import { useEffect, useRef } from "react";
import { useAdaptadorSpotify } from "@/hooks/useAdaptadorSpotify";
import { useAdaptadorYouTube } from "@/hooks/useAdaptadorYouTube";
import { useMediaSession } from "@/hooks/useMediaSession";
import { registrarAlternar } from "@/lib/playback";
import { obtenerReproductor } from "@/services/canales/youtube-iframe";
import { comprobarMeGusta } from "@/services/music/biblioteca";
import { avisoBreve } from "@/services/music/megusta";
import { controlador } from "@/services/reproductor/controladores";
import { useAppStore } from "@/store/app-store";
import { useMusicStore } from "@/store/music-store";
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

  // Temporizador para dormir (por tiempo): al llegar la hora, el volumen baja poco a poco y la música se pausa.
  const dormir = useReproductorStore((s) => s.dormir);
  useEffect(() => {
    if (dormir?.modo !== "tiempo") return;
    let bajando = false;
    const id = setInterval(() => {
      if (bajando || Date.now() < dormir.hasta) return;
      bajando = true;
      const s = useReproductorStore.getState();
      const original = s.volumen;
      const c = controlador(s.fuente);
      let paso = 0;
      const fundido = setInterval(() => {
        paso++;
        c?.volumen?.(Math.max(0, original * (1 - paso / 10)));
        if (paso >= 10) {
          clearInterval(fundido);
          useReproductorStore.getState().pausar();
          setTimeout(() => c?.volumen?.(original), 800); // el volumen queda como estaba para la próxima vez
          useReproductorStore.setState({ dormir: null });
          avisoBreve("Temporizador: música pausada", "Buenas noches.");
        }
      }, 400);
    }, 1000);
    return () => clearInterval(id);
  }, [dormir]);

  // Barra de estado: qué suena.
  const pista = useReproductorStore((s) => s.pista);
  const fuente = useReproductorStore((s) => s.fuente);
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);

  // Con Spotify conectado, se pregunta si la canción que suena ya te gusta (para dibujar el corazón lleno).
  const conectado = useMusicStore((s) => s.connection.status === "connected");
  useEffect(() => {
    if (!conectado || fuente !== "spotify" || !pista?.id.startsWith("track:")) return;
    if (useMusicStore.getState().permisosBiblioteca === "faltan") return;
    void comprobarMeGusta([pista.id]);
  }, [conectado, fuente, pista?.id]);
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
