import type { SpotifyPlaylist } from "@/types/music";
import { useMusicStore } from "@/store/music-store";
import { obtenerAccessToken } from "./oauth";

export { MusicApiError } from "./errores";

/** Llamada a la Web API de Spotify con el token del usuario conectado. */
export async function spotifyApi<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  const token = await obtenerAccessToken();
  if (!token) return { status: 401, data: null };
  let res: Response;
  try {
    res = await fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  } catch {
    // Sin red, o un bloqueador (Brave Shields, uBlock…) impidió la petición: status 0 = no llegó a Spotify.
    return { status: 0, data: null };
  }
  const data = res.status === 204 ? null : ((await res.json().catch(() => null)) as T | null);
  return { status: res.status, data };
}

interface PlaylistsResponse {
  items: ({ id: string; name: string; collaborative?: boolean; owner?: { id?: string } | null; images?: { url: string }[] | null; tracks?: { total: number } | null; items?: { total: number } | null } | null)[];
}

export async function fetchMyPlaylists(): Promise<SpotifyPlaylist[]> {
  const usuarioId = useMusicStore.getState().usuarioId;
  const { status, data } = await spotifyApi<PlaylistsResponse>("/me/playlists?limit=50");
  if (status !== 200 || !data) return [];
  return data.items
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ id: p.id, name: p.name, image: p.images?.[p.images.length - 1]?.url, cover: p.images?.[0]?.url, tracks: p.items?.total ?? p.tracks?.total, editable: p.collaborative === true || (!!usuarioId && p.owner?.id === usuarioId) }));
}
