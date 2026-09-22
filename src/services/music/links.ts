import { fetchExterno } from "@/lib/red";
import type { MusicItem, MusicKind } from "@/types/music";
import { MusicApiError } from "./errores";

const ID = "[A-Za-z0-9]{22}";
const URL_RE = new RegExp(`open\\.spotify\\.com/(?:intl-[a-z-]+/)?(track|album|playlist|artist)/(${ID})`);
const URI_RE = new RegExp(`^spotify:(track|album|playlist|artist):(${ID})$`);

export interface SpotifyRef {
  kind: MusicKind;
  id: string;
}

/** Reconoce un enlace o URI de Spotify. Devuelve null si el texto es una búsqueda normal. */
export function parseSpotifyLink(text: string): SpotifyRef | null {
  const t = text.trim();
  const m = URL_RE.exec(t) ?? URI_RE.exec(t);
  return m ? { kind: m[1] as MusicKind, id: m[2]! } : null;
}

const KIND_LABEL: Record<MusicKind, string> = { track: "Canción", album: "Álbum", playlist: "Playlist", artist: "Artista" };

/** Artistas de una canción, leídos de los datos públicos del embed. Es un extra: si falla, se omite. */
async function trackArtists(id: string): Promise<string | null> {
  try {
    const res = await fetchExterno(`https://open.spotify.com/embed/track/${id}`, { timeoutMs: 6000 });
    const html = await res.text();
    const m = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html);
    if (!m) return null;
    const entity = (JSON.parse(m[1]!) as { props?: { pageProps?: { state?: { data?: { entity?: { artists?: { name: string }[] } } } } } }).props?.pageProps?.state?.data?.entity;
    const names = (entity?.artists ?? []).map((a) => a.name);
    return names.length ? names.join(", ") : null;
  } catch {
    return null;
  }
}

/** Título y carátula de un enlace de Spotify, con oEmbed (público, no requiere credenciales). */
export async function resolveLink(ref: SpotifyRef): Promise<MusicItem> {
  const target = `https://open.spotify.com/${ref.kind}/${ref.id}`;
  let res: Response;
  try {
    res = await fetchExterno(`https://open.spotify.com/oembed?url=${encodeURIComponent(target)}`, { timeoutMs: 8000, cache: "no-store" });
  } catch {
    throw new MusicApiError("No se pudo contactar con Spotify.", "Comprueba tu conexión a internet e inténtalo de nuevo.", "NETWORK");
  }
  if (!res.ok) {
    throw new MusicApiError("Spotify no encontró ese enlace.", "Copia el enlace desde Spotify (Compartir → Copiar enlace) y asegúrate de que el contenido sea público.", "LINK_NOT_FOUND");
  }
  const data = (await res.json()) as { title?: string; thumbnail_url?: string };
  if (!data.title || !data.thumbnail_url) {
    throw new MusicApiError("No se pudo leer la información de ese enlace.", undefined, "LINK_UNREADABLE");
  }
  const subtitle = ref.kind === "track" ? ((await trackArtists(ref.id)) ?? KIND_LABEL.track) : KIND_LABEL[ref.kind];
  return { kind: ref.kind, id: ref.id, title: data.title, subtitle, cover: data.thumbnail_url };
}
