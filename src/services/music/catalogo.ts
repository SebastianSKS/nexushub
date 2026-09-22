import { DEMO_MUSIC } from "@/lib/music/demo-catalog";
import { normalize } from "@/lib/text";
import type { MusicItem } from "@/types/music";
import { spotifyApi } from "./api";
import { MusicApiError } from "./errores";
import { parseSpotifyLink, resolveLink } from "./links";

export interface ResultadoCatalogo {
  heading: string;
  items: MusicItem[];
}

interface RespuestaBusqueda {
  tracks?: { items: { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string; width: number }[] } }[] };
}

/** Busca en todo el catálogo de Spotify con el token de la propia cuenta conectada (no necesita Client Secret). */
async function buscarConectado(query: string): Promise<MusicItem[]> {
  const { status, data } = await spotifyApi<RespuestaBusqueda>(`/search?${new URLSearchParams({ q: query, type: "track", limit: "20" })}`);
  if (status === 0) throw new MusicApiError("No se pudo contactar con Spotify.", "Comprueba tu internet; si usas un bloqueador de anuncios, desactívalo para esta página.", "NETWORK");
  if (status === 401) throw new MusicApiError("Spotify cerró tu sesión.", "Conéctate de nuevo con Spotify Premium.", "NO_SESSION");
  if (status !== 200 || !data) throw new MusicApiError("Spotify no pudo completar la búsqueda.", "Inténtalo de nuevo en unos segundos.", "UNKNOWN");
  return (data.tracks?.items ?? []).map((t) => {
    const images = [...t.album.images].sort((a, b) => b.width - a.width);
    return { kind: "track" as const, id: t.id, title: t.name, subtitle: `${t.artists.map((a) => a.name).join(", ")} · ${t.album.name}`, cover: (images[1] ?? images[0])?.url ?? "" };
  });
}

/**
 * Contenido del módulo Música:
 * - sin texto: catálogo de sugeridos;
 * - un enlace o URI de Spotify: se resuelve a su canción/álbum/playlist (sin credenciales);
 * - texto, conectado: búsqueda en todo Spotify con el token de tu propia cuenta;
 * - texto, invitado: filtra los sugeridos (buscar todo el catálogo sin conectarse necesitaría un
 *   secreto de aplicación, que nunca debe viajar dentro de NexusHub).
 */
export async function cargarCatalogo(query: string, conectado: boolean): Promise<ResultadoCatalogo> {
  const q = query.trim();
  if (!q) return { heading: "Sugeridos para escuchar", items: [...DEMO_MUSIC] };

  const ref = parseSpotifyLink(q);
  if (ref) return { heading: "Enlace de Spotify", items: [await resolveLink(ref)] };

  if (conectado) return { heading: `Resultados para «${q}»`, items: await buscarConectado(q) };

  const terminos = normalize(q).split(/\s+/).filter(Boolean);
  const items = DEMO_MUSIC.filter((m) => terminos.every((t) => normalize(`${m.title} ${m.subtitle}`).includes(t)));
  return { heading: `Sugeridos que coinciden con «${q}»`, items };
}
