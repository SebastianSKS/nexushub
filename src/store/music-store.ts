import { create } from "zustand";
import { cargarCatalogo, type SeccionMusica } from "@/services/music/catalogo";
import { MusicApiError } from "@/services/music/errores";
import type { MusicItem, SpotifyConnection, SpotifyPlaylist } from "@/types/music";

export type MusicStatus = "idle" | "loading" | "ready" | "error";

/** Estado de Música que NO es reproducción (eso vive en reproductor-store): sugeridos, búsqueda y conexión. */
interface MusicState {
  status: MusicStatus;
  items: MusicItem[];
  /** Los renglones que se muestran (cada uno con su título). */
  secciones: SeccionMusica[];
  /** Solo con la cuenta conectada: false = falta volver a conectar para leer lo más escuchado. */
  permisosExtra: boolean | null;
  heading: string;
  query: string;
  error: { message: string; hint?: string; code?: string } | null;

  connection: SpotifyConnection;
  playlists: SpotifyPlaylist[];
  /** El id de usuario de la cuenta conectada (para saber qué playlists son suyas). */
  usuarioId: string | null;
  /** Canciones que ya te gustan en Spotify (id «track:…» → sí/no), de las que se ha preguntado. */
  meGusta: Record<string, boolean>;
  /** «faltan»: la sesión es anterior a los permisos de biblioteca; hay que reconectar. */
  permisosBiblioteca: "ok" | "faltan" | null;

  load: (query?: string) => Promise<void>;
  setConnection: (c: SpotifyConnection) => void;
  setPlaylists: (p: SpotifyPlaylist[]) => void;
}

// Solo cuenta la última petición: las respuestas viejas se descartan.
let requestSeq = 0;

export const useMusicStore = create<MusicState>((set, get) => ({
  status: "idle",
  items: [],
  secciones: [],
  permisosExtra: null,
  heading: "",
  query: "",
  error: null,

  connection: { status: "guest" },
  playlists: [],
  usuarioId: null,
  meGusta: {},
  permisosBiblioteca: null,

  load: async (query = "") => {
    const seq = ++requestSeq;
    set({ status: "loading", query, error: null });
    try {
      const res = await cargarCatalogo(query, get().connection.status === "connected");
      if (seq !== requestSeq) return;
      set({ status: "ready", items: res.items, secciones: res.secciones, heading: res.heading, permisosExtra: query.trim() ? get().permisosExtra : (res.permisosExtra ?? null) });
    } catch (err) {
      if (seq !== requestSeq) return;
      const e = err instanceof MusicApiError ? err : new MusicApiError("No se pudo cargar la música.", "Inténtalo de nuevo.");
      set({ status: "error", error: { message: e.message, hint: e.hint, code: e.code } });
    }
  },

  setConnection: (connection) => set({ connection }),
  setPlaylists: (playlists) => set({ playlists }),
}));
