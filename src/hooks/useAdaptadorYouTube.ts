"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cargarApiYouTube, fijarReproductor } from "@/services/canales/youtube-iframe";
import { registrarControlador } from "@/services/reproductor/controladores";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCanalesStore } from "@/store/canales-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

/** Código de error de la IFrame API → qué pasó y qué hacer. */
function describirError(codigo: number): string {
  switch (codigo) {
    case 101:
    case 150:
      return "El dueño de este video no permite reproducirlo fuera de YouTube. Ábrelo en YouTube o salta al siguiente.";
    case 100:
      return "Este video ya no está disponible (fue borrado o es privado).";
    case 2:
      return "YouTube no reconoce el identificador de este video.";
    default:
      return "YouTube no pudo reproducir este video. Inténtalo de nuevo o salta al siguiente.";
  }
}

/**
 * Adaptador de YouTube. El reproductor IFrame se crea UNA sola vez, dentro del contenedor fijo
 * (ContenedorVideo), y NO se destruye nunca al navegar: si cambiara de padre o se recreara, el
 * navegador recargaría el iframe y el video se reiniciaría. Solo cambia dónde se DIBUJA el contenedor.
 */
export function useAdaptadorYouTube(hostRef: RefObject<HTMLDivElement | null>) {
  const playerRef = useRef<YT.Player | null>(null);
  const listoRef = useRef(false);
  const creandoRef = useRef(false);
  const pendienteRef = useRef<{ pista: Pista; reproducir: boolean } | null>(null);

  const solicitud = useReproductorStore((s) => s.solicitud);
  const esYouTube = useReproductorStore((s) => s.fuente === "youtube");
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);

  /** Lee duración real (getDuration) y la comparte con la tienda y con la memoria de duraciones. */
  const informarDuracion = (p: YT.Player) => {
    try {
      const id = p.getVideoData().video_id;
      const d = p.getDuration();
      if (id && d > 0) {
        useCanalesStore.getState().guardarDuracion(id, d);
        if (useReproductorStore.getState().pista?.id === id) useReproductorStore.getState().informar({ duracion: Math.round(d) });
      }
    } catch {
      /* el reproductor aún no puede responder */
    }
  };

  // 1) Crear el reproductor la primera vez que se pide un video.
  useEffect(() => {
    const host = hostRef.current;
    if (!esYouTube || !host || playerRef.current || creandoRef.current) return;
    creandoRef.current = true;

    cargarApiYouTube()
      .then((YTApi) => {
        const montaje = document.createElement("div");
        host.appendChild(montaje); // YouTube reemplaza este nodo por el iframe: React no lo toca

        const player = new YTApi.Player(montaje, {
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 0, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: (e) => {
              listoRef.current = true;
              e.target.setVolume(useReproductorStore.getState().volumen);
              const p = pendienteRef.current;
              pendienteRef.current = null;
              if (p) {
                if (p.reproducir) e.target.loadVideoById(p.pista.id);
                else e.target.cueVideoById(p.pista.id);
              }
            },
            onStateChange: (e) => {
              const st = useReproductorStore.getState();
              // Un video que se pausa porque arrancó Spotify no debe pisar el estado de la otra fuente.
              if (st.fuente !== "youtube") return;
              if (e.data === YTApi.PlayerState.PLAYING) {
                st.informar({ reproduciendo: true, progreso: e.target.getCurrentTime() });
                informarDuracion(e.target);
              } else if (e.data === YTApi.PlayerState.PAUSED) {
                st.informar({ reproduciendo: false, progreso: e.target.getCurrentTime() });
              } else if (e.data === YTApi.PlayerState.CUED) {
                informarDuracion(e.target);
              } else if (e.data === YTApi.PlayerState.ENDED) {
                st.informar({ reproduciendo: false });
                st.siguiente(true); // paso automático
              }
            },
            onError: (e) => {
              const st = useReproductorStore.getState();
              if (st.fuente !== "youtube") return;
              st.informar({ reproduciendo: false, error: describirError(e.data) });
              // Aprende del error para que ese video quede atenuado en el muro; solo si es el video actual
              // (el panel de desarrollo carga uno inexistente a propósito).
              let idEnReproductor = "";
              try {
                idEnReproductor = e.target.getVideoData().video_id;
              } catch {
                idEnReproductor = "";
              }
              if (st.pista && (idEnReproductor === st.pista.id || idEnReproductor === "")) {
                if (e.data === 101 || e.data === 150) useCanalesStore.getState().marcarNoIncrustable(st.pista.id, "incrustacion_desactivada");
                else if (e.data === 100) useCanalesStore.getState().marcarNoIncrustable(st.pista.id, "no_disponible");
              }
            },
          },
        });
        playerRef.current = player;
        fijarReproductor(player);
      })
      .catch(() => {
        creandoRef.current = false;
        useReproductorStore.getState().informar({ error: "No se pudo cargar el reproductor de YouTube. Comprueba tu conexión a internet e inténtalo de nuevo." });
      });
  }, [esYouTube, solicitud, hostRef]);

  // 2) Cada petición nueva carga su pista (o la deja pendiente si el reproductor aún no está listo).
  useEffect(() => {
    const st = useReproductorStore.getState();
    if (st.fuente !== "youtube" || !st.pista) return;
    const reproducir = st.autoplay;
    const p = playerRef.current;
    if (!p || !listoRef.current) {
      pendienteRef.current = { pista: st.pista, reproducir };
      return;
    }
    if (reproducir) p.loadVideoById(st.pista.id);
    else p.cueVideoById(st.pista.id);
  }, [solicitud]);

  // 3) Progreso real mientras suena.
  useEffect(() => {
    if (!reproduciendo || !esYouTube) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && listoRef.current) useReproductorStore.getState().informar({ progreso: p.getCurrentTime() });
    }, 500);
    return () => clearInterval(id);
  }, [reproduciendo, esYouTube]);

  // 4) Controlador: lo que el resto de la app puede pedirle a YouTube.
  useEffect(() => {
    registrarControlador("youtube", {
      cargar: (pista, reproducir) => {
        const p = playerRef.current;
        if (p && listoRef.current) {
          if (reproducir) p.loadVideoById(pista.id);
          else p.cueVideoById(pista.id);
        } else pendienteRef.current = { pista, reproducir };
      },
      reanudar: () => playerRef.current?.playVideo(),
      pausar: () => {
        try {
          playerRef.current?.pauseVideo();
        } catch {
          /* aún no existe */
        }
      },
      buscar: (s) => playerRef.current?.seekTo(s, true),
      volumen: (v) => playerRef.current?.setVolume(v),
    });
    return () => registrarControlador("youtube", null);
  }, []);

  // Volumen por defecto al arrancar.
  useEffect(() => {
    useReproductorStore.setState({ volumen: useAjustesStore.getState().volumenPorDefecto });
  }, []);
}
