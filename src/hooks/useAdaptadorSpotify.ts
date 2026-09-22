"use client";

import { useEffect, useRef, type RefObject } from "react";
import { registrarControlador } from "@/services/reproductor/controladores";
import { fetchMyPlaylists, spotifyApi } from "@/services/music/api";
import { obtenerAccessToken } from "@/services/music/oauth";
import { loadSpotifyEmbedApi, loadSpotifySdk } from "@/services/music/loaders";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore, type Capacidades } from "@/store/reproductor-store";

interface Me {
  display_name?: string | null;
  product?: string;
}

const uriDe = (id: string) => `spotify:${id}`;

/** Cuerpo de PUT /me/player/play: una canción suelta, o un contexto (álbum, playlist, artista). */
function cuerpoPlay(id: string) {
  return id.startsWith("track:") ? { uris: [uriDe(id)] } : { context_uri: uriDe(id) };
}

const CAPACIDADES_SDK: Capacidades = { buscar: true, saltar: true, volumen: true, aleatorio: true, repetir: true };

/**
 * Adaptador de Spotify. Dos modos, mutuamente excluyentes según la conexión:
 *  - Invitado: embed oficial (iFrame API), oculto fuera de la pantalla; la interfaz es la barra global.
 *  - Conectado (Premium): Web Playback SDK, con todos los controles.
 * Vive en la raíz de la aplicación: no se desmonta al cambiar de sección, así la música no se corta.
 */
export function useAdaptadorSpotify(hostRef: RefObject<HTMLDivElement | null>) {
  const fuente = useReproductorStore((s) => s.fuente);
  const solicitud = useReproductorStore((s) => s.solicitud);
  const estado = useMusicStore((s) => s.connection.status);
  const conectado = estado === "connected";
  const invitado = fuente === "spotify" && !conectado;

  // ────────────────────────────── Invitado: embed ──────────────────────────────
  const embedRef = useRef<SpotifyEmbedController | null>(null);
  const creandoRef = useRef(false);
  const uriPendienteRef = useRef<string | null>(null);
  const debeReproducirRef = useRef(false);
  const terminadaRef = useRef(false);

  useEffect(() => {
    const st = useReproductorStore.getState();
    const host = hostRef.current;
    if (!invitado || !st.pista || !host) return;
    const uri = uriDe(st.pista.id);
    debeReproducirRef.current = st.autoplay;
    terminadaRef.current = false;

    if (embedRef.current) {
      embedRef.current.loadUri(uri); // el embed avisa con «ready» cuando termina de cargar
      return;
    }
    uriPendienteRef.current = uri;
    if (creandoRef.current) return;
    creandoRef.current = true;

    loadSpotifyEmbedApi()
      .then((api) => {
        const montaje = document.createElement("div");
        host.appendChild(montaje); // Spotify lo reemplaza por su iframe: React no lo toca
        api.createController(montaje, { uri: uriPendienteRef.current ?? uri, width: 300, height: 152 }, (controller) => {
          embedRef.current = controller;
          controller.addListener("ready", () => {
            if (debeReproducirRef.current) {
              debeReproducirRef.current = false;
              controller.play();
            }
          });
          controller.addListener("playback_update", (e) => {
            const { isPaused, isBuffering, duration, position } = e.data;
            const s = useReproductorStore.getState();
            if (s.fuente !== "spotify" || useMusicStore.getState().connection.status === "connected") return;
            s.informar({ reproduciendo: !isPaused && !isBuffering, progreso: position / 1000, duracion: Math.round(duration / 1000) });
            // Pasa a la siguiente de la cola cuando una canción termina sola.
            if (duration > 0 && isPaused && position >= duration - 300 && !terminadaRef.current && s.cola.length > 1 && s.pista?.id.startsWith("track:")) {
              terminadaRef.current = true;
              s.siguiente(true);
            }
          });
        });
      })
      .catch(() => {
        creandoRef.current = false;
        useReproductorStore.getState().informar({ error: "No se pudo cargar el reproductor de Spotify. Comprueba tu conexión a internet e inténtalo de nuevo." });
      });
  }, [invitado, solicitud, hostRef]);

  // ───────────────────────────── Conectado: Web Playback SDK ─────────────────────────────
  const playerRef = useRef<Spotify.Player | null>(null);
  const dispositivoRef = useRef<string | null>(null);

  // 1) Al entrar: interpreta el resultado del inicio de sesión y detecta una sesión existente.
  useEffect(() => {
    const store = useMusicStore.getState();
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("spotify");
    if (flag) window.history.replaceState(null, "", window.location.pathname);
    if (flag === "denied") {
      store.setConnection({ status: "error", message: "No autorizaste el acceso a Spotify.", hint: "Puedes volver a intentarlo cuando quieras; el Modo Invitado sigue funcionando." });
      return;
    }
    if (flag === "error") {
      store.setConnection({ status: "error", message: "No se pudo completar la conexión con Spotify.", hint: "Revisa que la URI de redirección de tu app de Spotify coincida exactamente e inténtalo de nuevo." });
      return;
    }
    if (flag === "not-configured") return;
    void obtenerAccessToken().then((token) => {
      if (token) useMusicStore.getState().setConnection({ status: "connecting" });
    });
  }, []);

  // 2) Conectando: verifica Premium y crea el reproductor.
  useEffect(() => {
    if (estado !== "connecting") return;
    let cancelado = false;

    (async () => {
      const store = useMusicStore.getState();
      const me = await spotifyApi<Me>("/me");
      if (cancelado) return;
      if (me.status !== 200 || !me.data) {
        store.setConnection({ status: "error", message: "Spotify no respondió con tu perfil.", hint: me.status === 0 ? "No se pudo contactar con Spotify: comprueba tu internet o desactiva el bloqueador (en Brave, el escudo) para esta página." : "Cierra la sesión de Spotify en NexusHub y conéctate de nuevo." });
        return;
      }
      const nombre = me.data.display_name || "tu cuenta";
      if (me.data.product !== "premium") {
        store.setConnection({ status: "not-premium", name: nombre });
        return;
      }
      try {
        await loadSpotifySdk();
      } catch {
        store.setConnection({ status: "error", message: "No se pudo cargar el reproductor de Spotify.", hint: "Comprueba tu conexión a internet." });
        return;
      }
      if (cancelado || !window.Spotify) return;

      const player = new window.Spotify.Player({
        name: "NexusHub",
        volume: useReproductorStore.getState().volumen / 100,
        getOAuthToken: (cb) => void obtenerAccessToken().then((t) => t && cb(t)),
      });
      playerRef.current = player;

      player.addListener("ready", ({ device_id }) => {
        dispositivoRef.current = device_id;
        useMusicStore.getState().setConnection({ status: "connected", name: nombre });
        void fetchMyPlaylists().then((p) => useMusicStore.getState().setPlaylists(p));
      });
      player.addListener("not_ready", () => {
        dispositivoRef.current = null;
      });
      player.addListener("player_state_changed", (s) => {
        const rep = useReproductorStore.getState();
        if (rep.fuente !== "spotify") return;
        if (!s) {
          rep.informar({ reproduciendo: false });
          return;
        }
        const t = s.track_window.current_track;
        const pista = rep.pista;
        // Terminó sola (el SDK la deja en pausa, en 0, con la pista en «previous_tracks»): sigue la cola.
        const terminada = s.paused && s.position === 0 && !!pista && pista.id.startsWith("track:") && s.track_window.previous_tracks.some((p) => p.id === t.id || `track:${p.id}` === pista.id);
        if (terminada && rep.cola.length > 1) {
          rep.siguiente(true);
          return;
        }
        rep.informar({
          reproduciendo: !s.paused,
          progreso: s.position / 1000,
          ...(pista ? { pista: { ...pista, titulo: t.name, artista: t.artists.map((a) => a.name).join(", "), caratula: t.album.images[0]?.url ?? pista.caratula, duracion: Math.round(s.duration / 1000) } } : {}),
        });
        useReproductorStore.setState({ aleatorio: s.shuffle, repetir: s.repeat_mode === 2 ? "una" : s.repeat_mode === 1 ? "todas" : "no" });
      });
      player.addListener("account_error", () => useMusicStore.getState().setConnection({ status: "not-premium", name: nombre }));
      player.addListener("authentication_error", () =>
        useMusicStore.getState().setConnection({ status: "error", message: "Spotify rechazó la sesión.", hint: "Cierra la sesión de Spotify en NexusHub y conéctate de nuevo." }),
      );
      player.addListener("initialization_error", () =>
        useMusicStore.getState().setConnection({
          status: "error",
          message: "Este navegador no puede reproducir música de Spotify.",
          hint: "Spotify exige protección de contenido (DRM). Abre NexusHub en Microsoft Edge, Chrome o Firefox. Los navegadores integrados en otras aplicaciones no la incluyen.",
        }),
      );
      player.addListener("playback_error", (e) => useReproductorStore.getState().informar({ reproduciendo: false, error: `Spotify no pudo reproducir esta pista: ${e.message}` }));

      const ok = await player.connect();
      if (!ok && !cancelado) {
        store.setConnection({ status: "error", message: "No se pudo conectar el reproductor de Spotify.", hint: "Inténtalo de nuevo en unos segundos." });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [estado]);

  // 3) Al pedir una pista estando conectado, se reproduce en este dispositivo.
  useEffect(() => {
    const st = useReproductorStore.getState();
    if (!conectado || st.fuente !== "spotify" || !st.pista || !dispositivoRef.current || !st.autoplay) return;
    const id = st.pista.id;
    void playerRef.current?.activateElement();
    void spotifyApi(`/me/player/play?device_id=${dispositivoRef.current}`, { method: "PUT", body: JSON.stringify(cuerpoPlay(id)) }).then(({ status }) => {
      if (status === 0) useReproductorStore.getState().informar({ reproduciendo: false, error: "No se pudo contactar con Spotify. Comprueba tu internet; si usas Brave o un bloqueador de anuncios, desactívalo para esta página." });
      else if (status === 403) useMusicStore.getState().setConnection({ status: "not-premium" });
      else if (status >= 400) useReproductorStore.getState().informar({ reproduciendo: false, error: "Spotify no pudo reproducir esto. Inténtalo con otra canción." });
    });
  }, [conectado, solicitud]);

  // Al conectarse, la fuente activa (si es Spotify) gana todos los controles.
  useEffect(() => {
    if (conectado && useReproductorStore.getState().fuente === "spotify") useReproductorStore.getState().informar({ capacidades: CAPACIDADES_SDK });
  }, [conectado, solicitud]);

  // Al salir de la aplicación se desconecta el reproductor.
  useEffect(
    () => () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    },
    [],
  );

  // ─────────────────────────────── Controlador ───────────────────────────────
  useEffect(() => {
    const deviceQuery = () => (dispositivoRef.current ? `&device_id=${dispositivoRef.current}` : "");
    if (conectado) {
      registrarControlador("spotify", {
        cargar: () => undefined, // la reproducción se dispara desde el efecto 3
        reanudar: () => void playerRef.current?.resume(),
        pausar: () => void playerRef.current?.pause(),
        buscar: (s) => void playerRef.current?.seek(s * 1000),
        siguiente: () => void playerRef.current?.nextTrack(),
        anterior: () => void playerRef.current?.previousTrack(),
        volumen: (v) => void playerRef.current?.setVolume(v / 100),
        aleatorio: (on) => void spotifyApi(`/me/player/shuffle?state=${on}${deviceQuery()}`, { method: "PUT" }),
        repetir: (m) => void spotifyApi(`/me/player/repeat?state=${m === "una" ? "track" : m === "todas" ? "context" : "off"}${deviceQuery()}`, { method: "PUT" }),
      });
    } else {
      registrarControlador("spotify", {
        cargar: (pista, reproducir) => {
          debeReproducirRef.current = reproducir;
          embedRef.current?.loadUri(uriDe(pista.id));
        },
        reanudar: () => embedRef.current?.play(),
        pausar: () => embedRef.current?.pause(),
        buscar: (s) => embedRef.current?.seek(s),
      });
    }
    return () => registrarControlador("spotify", null);
  }, [conectado]);

  // Progreso del SDK: el SDK no avisa cada segundo, así que se interpola en la barra (progresoActual).
}
