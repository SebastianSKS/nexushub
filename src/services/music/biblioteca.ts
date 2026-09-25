import type { Pista } from "@/store/reproductor-store";
import { useMusicStore } from "@/store/music-store";
import { spotifyApi } from "./api";

/**
 * Tu biblioteca de Spotify: «Me gusta» y playlists. Pide permisos que las primeras versiones de NexusHub no pedían
 * (biblioteca y edición de playlists): mientras la cuenta no se vuelva a conectar, Spotify responde 403 y aquí se
 * marca «faltan permisos» para que la interfaz ofrezca reconectar, sin romper nada más.
 */

export type ResultadoBiblioteca = "ok" | "permisos" | "error";

const uriDe = (id: string) => `spotify:${id.startsWith("track:") ? id : `track:${id}`}`;

function resultado(status: number): ResultadoBiblioteca {
  if (status >= 200 && status < 300) return "ok";
  if (status === 403) {
    useMusicStore.setState({ permisosBiblioteca: "faltan" });
    return "permisos";
  }
  return "error";
}

/** Marca en la memoria cuáles de estas canciones ya te gustan en Spotify (para dibujar el corazón). */
export async function comprobarMeGusta(ids: string[]): Promise<void> {
  const pistas = [...new Set(ids.filter((i) => i.startsWith("track:")))].slice(0, 40);
  if (pistas.length === 0) return;
  const { status, data } = await spotifyApi<boolean[]>(`/me/library/contains?uris=${pistas.map((i) => encodeURIComponent(uriDe(i))).join(",")}`);
  if (status !== 200 || !Array.isArray(data)) {
    resultado(status);
    return;
  }
  useMusicStore.setState((s) => ({ permisosBiblioteca: "ok", meGusta: { ...s.meGusta, ...Object.fromEntries(pistas.map((id, i) => [id, data[i] === true])) } }));
}

/** Guarda o quita una canción de «Canciones que te gustan». */
export async function guardarMeGusta(id: string, quiere: boolean): Promise<ResultadoBiblioteca> {
  const { status } = await spotifyApi(`/me/library?uris=${encodeURIComponent(uriDe(id))}`, { method: quiere ? "PUT" : "DELETE" });
  const r = resultado(status);
  if (r === "ok") useMusicStore.setState((s) => ({ permisosBiblioteca: "ok", meGusta: { ...s.meGusta, [id]: quiere } }));
  return r;
}

interface PistaGuardada {
  id: string | null;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: { url: string; width?: number }[] };
}

export interface PaginaMeGusta {
  pistas: Pista[];
  total: number;
  resultado: ResultadoBiblioteca;
}

/** Tus canciones guardadas, de a 50. */
export async function cancionesQueTeGustan(offset = 0): Promise<PaginaMeGusta> {
  const { status, data } = await spotifyApi<{ total: number; items: { track: PistaGuardada | null }[] }>(`/me/tracks?limit=50&offset=${offset}`);
  const r = resultado(status);
  if (r !== "ok" || !data) return { pistas: [], total: 0, resultado: r };
  const pistas: Pista[] = data.items
    .map((i) => i.track)
    .filter((t): t is PistaGuardada => !!t && !!t.id)
    .map((t) => ({ id: `track:${t.id}`, titulo: t.name, artista: t.artists.map((a) => a.name).join(", "), caratula: t.album.images[1]?.url ?? t.album.images[0]?.url ?? "", duracion: Math.round(t.duration_ms / 1000), fuente: "spotify" as const }));
  useMusicStore.setState((s) => ({ permisosBiblioteca: "ok", meGusta: { ...s.meGusta, ...Object.fromEntries(pistas.map((p) => [p.id, true])) } }));
  return { pistas, total: data.total, resultado: "ok" };
}

/** Crea una playlist privada vacía. Devuelve su id, o el motivo del fallo. */
export async function crearPlaylist(nombre: string): Promise<{ id: string } | ResultadoBiblioteca> {
  const { status, data } = await spotifyApi<{ id: string }>("/me/playlists", { method: "POST", body: JSON.stringify({ name: nombre.trim().slice(0, 100), public: false, description: "Creada desde NexusHub" }) });
  const r = resultado(status);
  return r === "ok" && data ? { id: data.id } : r === "ok" ? "error" : r;
}

export async function agregarAPlaylist(playlistId: string, pistaId: string): Promise<ResultadoBiblioteca> {
  const { status } = await spotifyApi(`/playlists/${encodeURIComponent(playlistId)}/items`, { method: "POST", body: JSON.stringify({ uris: [uriDe(pistaId)] }) });
  return resultado(status);
}

// --- Editar una playlist tuya -------------------------------------------------------------------------------------

export async function infoPlaylist(id: string): Promise<{ nombre: string; editable: boolean } | null> {
  const usuarioId = useMusicStore.getState().usuarioId;
  const { status, data } = await spotifyApi<{ name: string; collaborative?: boolean; owner?: { id?: string } | null }>(`/playlists/${encodeURIComponent(id)}?fields=name,collaborative,owner(id)`);
  if (status !== 200 || !data) return null;
  return { nombre: data.name, editable: data.collaborative === true || (!!usuarioId && data.owner?.id === usuarioId) };
}

export async function renombrarPlaylist(id: string, nombre: string): Promise<ResultadoBiblioteca> {
  const { status } = await spotifyApi(`/playlists/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ name: nombre.trim().slice(0, 100) }) });
  return resultado(status);
}

/** «Eliminar» una playlist en Spotify es dejar de seguirla: desaparece de tu biblioteca. */
export async function eliminarPlaylist(id: string): Promise<ResultadoBiblioteca> {
  const { status } = await spotifyApi(`/playlists/${encodeURIComponent(id)}/followers`, { method: "DELETE" });
  return resultado(status);
}

export async function quitarDePlaylist(id: string, pistaId: string): Promise<ResultadoBiblioteca> {
  const { status } = await spotifyApi(`/playlists/${encodeURIComponent(id)}/items`, { method: "DELETE", body: JSON.stringify({ items: [{ uri: uriDe(pistaId) }] }) });
  return resultado(status);
}
