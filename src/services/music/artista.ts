import { useMusicStore } from "@/store/music-store";
import { traducir } from "@/lib/i18n";
import type { Pista } from "@/store/reproductor-store";
import type { MusicItem } from "@/types/music";
import { spotifyApi } from "./api";
import { cargarLista, ErrorLista } from "./lista";

/** Todo lo de la página de un artista: quién es, sus canciones más escuchadas, su discografía y si lo sigues. */

export interface DatosArtista {
  id: string;
  nombre: string;
  imagen: string;
  populares: Pista[];
}

interface ArtistaApi {
  name: string;
  images?: { url: string; width?: number }[];
}
interface AlbumApi {
  id: string;
  name: string;
  album_type?: string;
  release_date?: string;
  images?: { url: string; width?: number }[];
}

const imagenGrande = (imgs?: { url: string; width?: number }[]) => [...(imgs ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? "";
const imagenMediana = (imgs?: { url: string; width?: number }[]) => {
  const o = [...(imgs ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return (o[1] ?? o[0])?.url ?? "";
};

/** Nombre, foto y canciones más escuchadas. Las canciones salen de la página pública del artista (Spotify ya no las da por su API). */
export async function cargarArtista(id: string): Promise<DatosArtista> {
  const [api, lista] = await Promise.all([
    spotifyApi<ArtistaApi>(`/artists/${id}`),
    cargarLista("artist", id).catch((e: unknown) => (e instanceof ErrorLista ? e : new ErrorLista(traducir("No se pudo cargar al artista.")))),
  ]);
  const enLista = lista instanceof ErrorLista ? null : lista;
  if (api.status !== 200 && !enLista) throw lista instanceof ErrorLista ? lista : new ErrorLista(traducir("No se pudo cargar al artista."));
  const nombre = api.data?.name ?? enLista?.titulo ?? traducir("Artista");
  return {
    id,
    nombre,
    imagen: imagenGrande(api.data?.images) || enLista?.caratula || "",
    populares: (enLista?.canciones ?? [])
      .filter((c) => c.reproducible)
      .map((c) => ({ id: c.id, titulo: c.titulo, artista: c.artista || nombre, caratula: "", duracion: c.duracion, fuente: "spotify" as const, artistId: id })),
  };
}

export interface Discografia {
  albumes: MusicItem[];
  sencillos: MusicItem[];
}

const deAlbum = (a: AlbumApi, nombre: string): MusicItem => ({
  kind: "album",
  id: a.id,
  title: a.name,
  subtitle: `${a.release_date?.slice(0, 4) ?? ""}${a.release_date ? " · " : ""}${a.album_type === "single" ? traducir("Sencillo") : traducir("Álbum")} · ${nombre}`,
  cover: imagenMediana(a.images),
});

/** Álbumes y sencillos del artista, de más nuevo a más viejo, de a 10. */
export async function cargarDiscografia(id: string, nombre: string, grupo: "album" | "single", offset = 0): Promise<{ items: MusicItem[]; hayMas: boolean }> {
  const { status, data } = await spotifyApi<{ items: (AlbumApi | null)[]; next?: string | null }>(`/artists/${id}/albums?${new URLSearchParams({ include_groups: grupo, limit: "10", offset: String(offset) })}`);
  if (status !== 200 || !data) return { items: [], hayMas: false };
  const items = data.items.filter((a): a is AlbumApi => !!a).map((a) => deAlbum(a, nombre));
  return { items, hayMas: !!data.next };
}

/** ¿Sigues a este artista? null = no se pudo saber (sin sesión o sin permiso). */
export async function sigoAlArtista(id: string): Promise<boolean | null> {
  const { status, data } = await spotifyApi<boolean[]>(`/me/following/contains?type=artist&ids=${id}`);
  if (status === 403) useMusicStore.setState({ permisosBiblioteca: "faltan" });
  return status === 200 && Array.isArray(data) ? data[0] === true : null;
}

export async function seguirArtista(id: string, seguir: boolean): Promise<"ok" | "permisos" | "error"> {
  const { status } = await spotifyApi(`/me/following?type=artist&ids=${id}`, { method: seguir ? "PUT" : "DELETE" });
  if (status >= 200 && status < 300) return "ok";
  if (status === 403) {
    useMusicStore.setState({ permisosBiblioteca: "faltan" });
    return "permisos";
  }
  return "error";
}

/** Artistas que sigues (de a 50). */
export async function artistasSeguidos(): Promise<{ items: MusicItem[]; resultado: "ok" | "permisos" | "error" }> {
  const { status, data } = await spotifyApi<{ artists: { items: (ArtistaApi & { id: string })[] } }>("/me/following?type=artist&limit=50");
  if (status === 403) {
    useMusicStore.setState({ permisosBiblioteca: "faltan" });
    return { items: [], resultado: "permisos" };
  }
  if (status !== 200 || !data) return { items: [], resultado: "error" };
  return { items: data.artists.items.map((a) => ({ kind: "artist" as const, id: a.id, title: a.name, subtitle: "Artista", cover: imagenMediana(a.images) })), resultado: "ok" };
}

/** Álbumes que guardaste (de a 50). */
export async function albumesGuardados(): Promise<{ items: MusicItem[]; resultado: "ok" | "permisos" | "error" }> {
  const { status, data } = await spotifyApi<{ items: { album: (AlbumApi & { artists?: { name: string }[] }) | null }[] }>("/me/albums?limit=50");
  if (status === 403) {
    useMusicStore.setState({ permisosBiblioteca: "faltan" });
    return { items: [], resultado: "permisos" };
  }
  if (status !== 200 || !data) return { items: [], resultado: "error" };
  return {
    items: data.items
      .map((i) => i.album)
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ kind: "album" as const, id: a.id, title: a.name, subtitle: traducir("Álbum · {artistas}", { artistas: (a.artists ?? []).map((x) => x.name).join(", ") }), cover: imagenMediana(a.images) })),
    resultado: "ok",
  };
}
