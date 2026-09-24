"use client";

import { useEffect, useRef, type RefObject } from "react";
import { registrarControlador } from "@/services/reproductor/controladores";
import { fetchMyPlaylists, spotifyApi } from "@/services/music/api";
import { obtenerAccessToken } from "@/services/music/oauth";
import { loadSpotifyEmbedApi, loadSpotifySdk } from "@/services/music/loaders";
import { radioDe } from "@/services/music/radio";
import { useAjustesStore } from "@/store/ajustes-store";
import { useMusicStore } from "@/store/music-store";
import { progresoActual, useReproductorStore, type Capacidades, type Pista } from "@/store/reproductor-store";

interface Me {
  id?: string;
  display_name?: string | null;
  product?: string;
}

const uriDe = (id: string) => `spotify:${id}`;

/**
 * Cuerpo de PUT /me/player/play. Las canciones se piden de una en una: la cola (siguiente, aleatorio, repetir, «añadir a la
 * cola») es de NexusHub y NO toca la cola de tu Spotify. Álbumes, playlists y artistas se dan como contexto.
 */
function cuerpoPlay(pista: Pista) {
  return pista.id.startsWith("track:") ? { uris: [uriDe(pista.id)] } : { context_uri: uriDe(pista.id) };
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
            // Pasa a la siguiente de la cola (o repite) cuando una canción termina sola. El embed a veces deja de avisar justo al
            // final, así que basta con estar a menos de medio segundo, suene o esté ya en pausa.
            if (duration > 0 && position >= duration - 500 && !terminadaRef.current && s.pista?.id.startsWith("track:") && (s.cola.length > 1 || s.repetir !== "no")) {
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
  /** Último estado conocido de Spotify, para reconocer cuándo una canción terminó sola. */
  const ultimoRef = useRef<{ id: string | null; playing: boolean } | null>(null);
  /** Para no pasar dos veces a la siguiente por la misma petición de reproducir. */
  const finRef = useRef<string | null>(null);
  /** La radio: para qué canción se pidieron ya canciones parecidas (una sola vez por canción) y su resultado pendiente. */
  const radioRef = useRef<{ id: string; espera: Promise<void> } | null>(null);

  /**
   * Como en Spotify, la música sigue sola: cuando quedan menos de 3 canciones por sonar, se piden más parecidas a la que
   * suena y se añaden al final. Así, elegir una canción es suficiente; nadie tiene que armar una cola.
   */
  const rellenarRadio = (pista: Pista) => {
    const s = useReproductorStore.getState();
    if (s.repetir !== "no" || !useAjustesStore.getState().seguirConSimilares) return;
    if (s.cola.length - s.indiceActual - 1 >= 3) return;
    if (radioRef.current?.id === pista.id) return;
    radioRef.current = {
      id: pista.id,
      espera: radioDe(pista, s.cola, 12)
        .then((mas) => {
          const vivo = useReproductorStore.getState();
          if (mas.length > 0 && vivo.fuente === "spotify") vivo.extenderCola(mas);
        })
        .catch(() => undefined),
    };
  };

  /** Terminó una canción: pasa a la siguiente; si no había más, espera un momento a que llegue la radio antes de rendirse. */
  const alTerminarCancion = async () => {
    let s = useReproductorStore.getState();
    const eraLaUltima = s.indiceActual >= s.cola.length - 1 && s.repetir !== "una";
    if (eraLaUltima && s.pista) {
      rellenarRadio(s.pista);
      await Promise.race([radioRef.current?.espera, new Promise((r) => setTimeout(r, 6000))]);
      s = useReproductorStore.getState();
    }
    s.siguiente(true);
  };

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
      useMusicStore.setState({ usuarioId: me.data.id ?? null });
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
        const previo = ultimoRef.current;
        ultimoRef.current = { id: t.id, playing: !s.paused };

        // Una canción SUELTA (lo normal: la cola es de NexusHub) termina así: Spotify la deja en pausa, al principio o al final,
        // habiendo estado sonando. Entonces NexusHub pasa a la siguiente de la cola.
        const terminada =
          !!pista?.id.startsWith("track:") &&
          !!previo?.playing &&
          previo.id === t.id &&
          s.paused &&
          s.duration > 0 &&
          (s.position === 0 || s.position >= s.duration - 400) &&
          progresoActual(rep) >= s.duration / 1000 - 8;
        if (terminada && finRef.current !== `${rep.solicitud}`) {
          finRef.current = `${rep.solicitud}`;
          void alTerminarCancion();
          return;
        }

        rep.informar({
          reproduciendo: !s.paused,
          progreso: s.position / 1000,
          ...(pista?.id.startsWith("track:")
            ? { duracion: Math.round(s.duration / 1000) }
            : pista
              ? { pista: { ...pista, titulo: t.name, artista: t.artists.map((a) => a.name).join(", "), caratula: t.album.images[0]?.url ?? pista.caratula, duracion: Math.round(s.duration / 1000) } }
              : {}),
        });

        // Si la pista vino sin carátula (las de la radio), se toma la que trae Spotify.
        if (pista?.id.startsWith("track:") && !pista.caratula && t.album.images[0]) rep.informar({ pista: { ...pista, caratula: t.album.images[0].url } });
        if (pista?.id.startsWith("track:") && !s.paused) rellenarRadio(pista);
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
    const pista = st.pista;
    const cuerpo = cuerpoPlay(pista);
    finRef.current = null;
    ultimoRef.current = null;
    void playerRef.current?.activateElement();
    void spotifyApi(`/me/player/play?device_id=${dispositivoRef.current}`, { method: "PUT", body: JSON.stringify(cuerpo) }).then(({ status }) => {
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
