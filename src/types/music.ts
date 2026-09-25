export type MusicKind = "track" | "album" | "playlist" | "artist";

/** Algo que se puede reproducir con el embed de Spotify. */
export interface MusicItem {
  kind: MusicKind;
  /** ID de Spotify (22 caracteres). */
  id: string;
  title: string;
  /** Artista (canciones), o el tipo de contenido. */
  subtitle: string;
  cover: string;
  /** Solo canciones, cuando se conocen: para «Ir al artista» e «Ir al álbum». */
  artistId?: string;
  albumId?: string;
}

export interface MusicItemsResponse {
  /** Hay credenciales de Spotify válidas para buscar en todo el catálogo. */
  searchAvailable: boolean;
  heading: string;
  items: MusicItem[];
}

export interface SpotifyStatus {
  /** Hay Client ID + Secret: se puede buscar con la API (Modo Invitado ampliado). */
  search: boolean;
  /** Hay Client ID: se puede ofrecer «Conectar con Spotify Premium». */
  connect: boolean;
}

export type SpotifyConnection =
  | { status: "guest" }
  | { status: "connecting" }
  | { status: "connected"; name: string }
  | { status: "not-premium"; name?: string }
  | { status: "error"; message: string; hint?: string };

export interface SpotifyPlaylist {
  id: string;
  name: string;
  image?: string;
  /** La carátula grande (para tarjetas). */
  cover?: string;
  tracks?: number;
  /** Se le pueden añadir canciones: es tuya o colaborativa. */
  editable?: boolean;
}

/** Estado unificado del reproductor (embed o SDK). Tiempos en milisegundos. */
export interface MusicPlayback {
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
}
