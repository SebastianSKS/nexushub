import { create } from "zustand";
import { cargarCatalogo } from "@/services/music/catalogo";
import { MusicApiError } from "@/services/music/errores";
import type { MusicItem, SpotifyConnection, SpotifyPlaylist } from "@/types/music";

export type MusicStatus = "idle" | "loading" | "ready" | "error";

/** Estado de Música que NO es reproducción (eso vive en reproductor-store): sugeridos, búsqueda y conexión. */
interface MusicState {
  status: MusicStatus;
  items: MusicItem[];
  heading: string;
  query: string;
  error: { message: string; hint?: string; code?: string } | null;

  connection: SpotifyConnection;
  playlists: SpotifyPlaylist[];

  load: (query?: string) => Promise<void>;
  setConnection: (c: SpotifyConnection) => void;
  setPlaylists: (p: SpotifyPlaylist[]) => void;
}

// Solo cuenta la última petición: las respuestas viejas se descartan.
let requestSeq = 0;

export const useMusicStore = create<MusicState>((set, get) => ({
  status: "idle",
  items: [],
  heading: "",
  query: "",
  error: null,

  connection: { status: "guest" },
  playlists: [],

  load: async (query = "") => {
    const seq = ++requestSeq;
    set({ status: "loading", query, error: null });
    try {
      const res = await cargarCatalogo(query, get().connection.status === "connected");
      if (seq !== requestSeq) return;
      set({ status: "ready", items: res.items, heading: res.heading });
    } catch (err) {
      if (seq !== requestSeq) return;
      const e = err instanceof MusicApiError ? err : new MusicApiError("No se pudo cargar la música.", "Inténtalo de nuevo.");
      set({ status: "error", error: { message: e.message, hint: e.hint, code: e.code } });
    }
  },

  setConnection: (connection) => set({ connection }),
  setPlaylists: (playlists) => set({ playlists }),
}));
