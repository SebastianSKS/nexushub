/** "canal": suscripción a un canal de YouTube. "lista": suscripción a una lista de reproducción. */
export type TipoCanal = "canal" | "lista";

/** Un canal (o lista) en la biblioteca personal del usuario. */
export interface Canal {
  /** Canal: "UC" + 22 caracteres. Lista: el playlist_id. */
  id: string;
  nombre: string;
  /** URL de la imagen del canal, o null si no se pudo obtener (la interfaz muestra la inicial). */
  avatar: string | null;
  tipo: TipoCanal;
  /** Fecha ISO en la que se agregó. */
  agregadoEn: string;
  /** true si vino precargado como sugerencia y el usuario aún no lo ha hecho suyo. */
  sugerido?: boolean;
}

/** Forma guardada en localStorage. */
export interface AlmacenCanales {
  version: 1;
  canales: Canal[];
}

/** Video normalizado a partir de una entrada del feed Atom. */
export interface VideoCanal {
  videoId: string;
  titulo: string;
  canalId: string;
  canalNombre: string;
  /** Fecha ISO de publicación. */
  publicado: string;
  miniatura: string;
  /** Punto de partida optimista: la verificación real llega por /api/videos/verificar. */
  incrustable: boolean;
}

export type MotivoNoIncrustable = "incrustacion_desactivada" | "no_disponible";

export interface ResultadoVerificacion {
  videoId: string;
  incrustable: boolean;
  motivo?: MotivoNoIncrustable;
}

/** Respuesta de GET /api/canal/[id]/videos */
export interface RespuestaVideos {
  id: string;
  nombre: string;
  tipo: TipoCanal;
  videos: VideoCanal[];
  /** Cuándo se descargó el feed (ISO). */
  obtenidoEn: string;
  desdeCache: boolean;
}

/** Respuesta de POST /api/canal/resolver */
export interface CanalResuelto {
  id: string;
  nombre: string;
  avatar: string | null;
  tipo: TipoCanal;
}
