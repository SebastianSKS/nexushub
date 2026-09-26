import { getTexto } from "@/lib/red";
import { traducir } from "@/lib/i18n";
import type { Pista } from "@/store/reproductor-store";
import type { MusicItem } from "@/types/music";

export type TipoLista = "playlist" | "album" | "artist" | "track";

export interface CancionLista {
  /** «track:ID», el formato de las pistas de Spotify en el reproductor. */
  id: string;
  titulo: string;
  artista: string;
  /** Segundos. */
  duracion: number;
  reproducible: boolean;
}

export interface ListaSpotify {
  tipo: TipoLista;
  id: string;
  titulo: string;
  subtitulo: string;
  caratula: string;
  canciones: CancionLista[];
}

export class ErrorLista extends Error {
  readonly pista?: string;

  constructor(message: string, pista?: string) {
    super(message);
    this.name = "ErrorLista";
    this.pista = pista;
  }
}

export const TIPOS_LISTA: readonly string[] = ["playlist", "album", "artist", "track"];
export const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;

interface Entidad {
  title?: string;
  name?: string;
  subtitle?: string;
  coverArt?: { sources?: { url: string }[] };
  trackList?: { uri: string; title: string; subtitle: string; duration: number; isPlayable?: boolean }[];
}

/**
 * Lee el contenido de una lista de la página pública del reproductor incrustado de Spotify
 * (open.spotify.com/embed): no requiere cuenta ni credenciales. Si Spotify cambia el formato de esa página,
 * esto falla con un mensaje claro y la lista se puede reproducir igualmente con el botón principal.
 */
export async function cargarLista(tipo: TipoLista, id: string): Promise<ListaSpotify> {
  let res;
  try {
    res = await getTexto(`https://open.spotify.com/embed/${tipo}/${id}`, { timeoutMs: 12_000 });
  } catch {
    throw new ErrorLista(traducir("No se pudo contactar con Spotify."), traducir("Comprueba tu conexión a internet e inténtalo de nuevo."));
  }
  if (res.status === 404) throw new ErrorLista(traducir("Spotify no encuentra esta lista."), traducir("Puede que haya sido borrada o sea privada."));
  if (res.status !== 200) throw new ErrorLista(traducir("Spotify no respondió como se esperaba."), traducir("Inténtalo de nuevo en unos segundos."));

  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(res.text);
  if (!m) throw new ErrorLista(traducir("No se pudo leer el contenido de esta lista."), traducir("Spotify pudo cambiar el formato de su página. Puedes reproducirla igualmente con «Reproducir»."));
  let e: Entidad | undefined;
  try {
    e = (JSON.parse(m[1]!) as { props?: { pageProps?: { state?: { data?: { entity?: Entidad } } } } }).props?.pageProps?.state?.data?.entity;
  } catch {
    e = undefined;
  }
  if (!e) throw new ErrorLista(traducir("No se pudo leer el contenido de esta lista."), traducir("Puedes reproducirla igualmente con «Reproducir»."));

  return {
    tipo,
    id,
    titulo: e.title ?? e.name ?? traducir("Lista de Spotify"),
    subtitulo: e.subtitle ?? "",
    caratula: e.coverArt?.sources?.[0]?.url ?? "",
    canciones: (e.trackList ?? [])
      .filter((t) => t.uri.startsWith("spotify:track:"))
      .map((t) => ({
        id: t.uri.slice("spotify:".length),
        titulo: t.title,
        artista: t.subtitle,
        duracion: Math.round(t.duration / 1000),
        reproducible: t.isPlayable !== false,
      })),
  };
}

/** Un elemento del catálogo → la pista que entiende el reproductor global. */
export function pistaDeItem(item: MusicItem): Pista {
  return { id: `${item.kind}:${item.id}`, titulo: item.title, artista: item.subtitle, caratula: item.cover, duracion: 0, fuente: "spotify", artistId: item.artistId };
}
