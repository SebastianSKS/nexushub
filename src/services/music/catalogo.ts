import { DEMO_MUSIC } from "@/lib/music/demo-catalog";
import { normalize } from "@/lib/text";
import { useFavoritosStore } from "@/store/favoritos-store";
import type { MusicItem } from "@/types/music";
import { spotifyApi } from "./api";
import { MusicApiError } from "./errores";
import { parseSpotifyLink, resolveLink } from "./links";

/** Un renglón de la pantalla de Música: un título y sus tarjetas. */
export interface SeccionMusica {
  titulo: string;
  items: MusicItem[];
}

export interface ResultadoCatalogo {
  heading: string;
  /** Todas las canciones (sin repetir) de las secciones: lo que se usa como cola de reproducción. */
  items: MusicItem[];
  secciones: SeccionMusica[];
  /** Solo en el inicio conectado: ¿tiene la sesión los permisos para leer lo más escuchado y lo reciente? */
  permisosExtra?: boolean;
}

interface Imagen {
  url: string;
  width: number;
}
interface PistaApi {
  id: string;
  name: string;
  artists: { id?: string; name: string }[];
  album: { id?: string; name: string; images: Imagen[] };
}
interface AlbumApi {
  id: string;
  name: string;
  artists: { name: string }[];
  images: Imagen[];
}
interface ArtistaApi {
  id: string;
  name: string;
  images?: Imagen[];
}
interface ListaApi {
  id: string;
  name: string;
  owner?: { display_name?: string | null } | null;
  images?: Imagen[] | null;
}
interface RespuestaBusqueda {
  tracks?: { items: (PistaApi | null)[] };
  albums?: { items: (AlbumApi | null)[] };
  artists?: { items: (ArtistaApi | null)[] };
  playlists?: { items: (ListaApi | null)[] };
}

/** La carátula mediana (o la que haya). */
const cover = (imgs: Imagen[] | undefined) => {
  const orden = [...(imgs ?? [])].sort((a, b) => b.width - a.width);
  return (orden[1] ?? orden[0])?.url ?? "";
};

const dePista = (t: PistaApi): MusicItem => ({ kind: "track", id: t.id, title: t.name, subtitle: `${t.artists.map((a) => a.name).join(", ")} · ${t.album.name}`, cover: cover(t.album.images), artistId: t.artists[0]?.id, albumId: t.album.id });
const deAlbum = (a: AlbumApi): MusicItem => ({ kind: "album", id: a.id, title: a.name, subtitle: `Álbum · ${a.artists.map((x) => x.name).join(", ")}`, cover: cover(a.images) });
const deLista = (l: ListaApi): MusicItem => ({ kind: "playlist", id: l.id, title: l.name, subtitle: `Playlist${l.owner?.display_name ? ` · ${l.owner.display_name}` : ""}`, cover: cover(l.images ?? []) });
const deArtista = (a: ArtistaApi): MusicItem => ({ kind: "artist", id: a.id, title: a.name, subtitle: "Artista", cover: cover(a.images) });
function sinNulos<T>(lista: (T | null)[] | undefined): T[] {
  return (lista ?? []).filter((x): x is T => x !== null && x !== undefined);
}

function errorDeEstado(status: number): MusicApiError {
  if (status === 0) return new MusicApiError("No se pudo contactar con Spotify.", "Comprueba tu internet; si usas un bloqueador de anuncios, desactívalo para esta página.", "NETWORK");
  if (status === 401) return new MusicApiError("Spotify cerró tu sesión.", "Conéctate de nuevo con Spotify Premium.", "NO_SESSION");
  return new MusicApiError("Spotify no pudo completar la búsqueda.", "Inténtalo de nuevo en unos segundos.", "UNKNOWN");
}

function sinRepetir(items: MusicItem[], vistas = new Set<string>()): MusicItem[] {
  return items.filter((c) => (vistas.has(c.id) ? false : (vistas.add(c.id), true)));
}

/**
 * Busca en todo el catálogo de Spotify con el token de tu propia cuenta (no necesita Client Secret).
 * Spotify limita cada búsqueda a 10 resultados por tipo: para tener 20 canciones se piden dos páginas.
 */
async function buscarConectado(query: string): Promise<SeccionMusica[]> {
  const q = (offset: number, tipos: string) => `/search?${new URLSearchParams({ q: query, type: tipos, limit: "10", offset: String(offset) })}`;
  const [a, b] = await Promise.all([spotifyApi<RespuestaBusqueda>(q(0, "track,album,artist,playlist")), spotifyApi<RespuestaBusqueda>(q(10, "track"))]);
  if (a.status !== 200 || !a.data) throw errorDeEstado(a.status);

  const canciones = sinRepetir([...sinNulos(a.data.tracks?.items), ...(b.status === 200 ? sinNulos(b.data?.tracks?.items) : [])].map(dePista));
  const secciones: SeccionMusica[] = [
    { titulo: "Canciones", items: canciones },
    { titulo: "Artistas", items: sinNulos(a.data.artists?.items).slice(0, 6).map(deArtista) },
    { titulo: "Álbumes", items: sinNulos(a.data.albums?.items).map(deAlbum) },
    { titulo: "Playlists", items: sinNulos(a.data.playlists?.items).map(deLista) },
  ];
  return secciones.filter((s) => s.items.length > 0);
}

// --- Inicio dinámico -----------------------------------------------------------------------------------------

function azar<T>(lista: readonly T[], n: number): T[] {
  return [...lista].sort(() => Math.random() - 0.5).slice(0, n);
}

/** Géneros (etiqueta que entiende Spotify, y cómo se muestra) para descubrir música distinta cada vez. */
const GENEROS: readonly { tag: string; nombre: string }[] = [
  { tag: "reggaeton", nombre: "Reggaetón" },
  { tag: "latin pop", nombre: "Pop latino" },
  { tag: "rock en espanol", nombre: "Rock en español" },
  { tag: "cumbia", nombre: "Cumbia" },
  { tag: "regional mexican", nombre: "Regional mexicano" },
  { tag: "corridos tumbados", nombre: "Corridos tumbados" },
  { tag: "hip hop", nombre: "Hip hop" },
  { tag: "trap latino", nombre: "Trap latino" },
  { tag: "lo-fi", nombre: "Lo-fi para estudiar" },
  { tag: "indie pop", nombre: "Indie pop" },
  { tag: "edm", nombre: "Electrónica" },
  { tag: "salsa", nombre: "Salsa" },
  { tag: "latin ballad", nombre: "Baladas" },
  { tag: "k-pop", nombre: "K-pop" },
  { tag: "rock", nombre: "Rock" },
  { tag: "jazz", nombre: "Jazz" },
  { tag: "synthwave", nombre: "Synthwave" },
  { tag: "anime", nombre: "Música de anime" },
];

export async function buscarCanciones(q: string, offset = 0): Promise<MusicItem[]> {
  const { status, data } = await spotifyApi<RespuestaBusqueda>(`/search?${new URLSearchParams({ q, type: "track", limit: "10", offset: String(offset) })}`);
  return status === 200 ? sinNulos(data?.tracks?.items).map(dePista) : [];
}

/** Los artistas que más suenan en tu cuenta de NexusHub (favoritos y reproducidos), para sugerirte «Más de…». */
function artistasLocales(): string[] {
  const s = useFavoritosStore.getState();
  s.cargar();
  const nombres = [...s.favoritos, ...s.recientes]
    .filter((p) => p.fuente === "spotify")
    .map((p) => p.artista.split(/[,·]/)[0]!.trim())
    .filter((n) => n.length > 1);
  return [...new Set(nombres)];
}

async function inicioConectado(): Promise<{ secciones: SeccionMusica[]; permisosExtra: boolean }> {
  const [recientes, top, topArtistas] = await Promise.all([
    spotifyApi<{ items: { track: PistaApi | null }[] }>("/me/player/recently-played?limit=20"),
    spotifyApi<{ items: (PistaApi | null)[] }>("/me/top/tracks?limit=10&time_range=short_term"),
    spotifyApi<{ items: (ArtistaApi | null)[] }>("/me/top/artists?limit=8&time_range=medium_term"),
  ]);
  if (recientes.status === 401) throw errorDeEstado(401);
  const permisosExtra = recientes.status === 200 || top.status === 200;

  const vistas = new Set<string>();
  const enReciente = sinRepetir(sinNulos((recientes.data?.items ?? []).map((i) => i.track)).map(dePista), vistas).slice(0, 10);
  const enTop = sinRepetir(sinNulos(top.data?.items).map(dePista), vistas);

  const artistas = topArtistas.status === 200 ? sinNulos(topArtistas.data?.items).map((a) => a.name) : artistasLocales();
  const semillas = azar(artistas, 2);
  const generos = azar(GENEROS, 2);
  const ano = new Date().getFullYear();

  const [novedades, ...resto] = await Promise.all([
    spotifyApi<RespuestaBusqueda>(`/search?${new URLSearchParams({ q: "tag:new", type: "album", limit: "10" })}`),
    ...semillas.map((a) => buscarCanciones(`artist:"${a}"`, Math.floor(Math.random() * 3) * 10)),
    ...generos.map((g) => buscarCanciones(`genre:"${g.tag}" year:${ano - 3}-${ano}`, Math.floor(Math.random() * 5) * 10)),
  ]);
  if (novedades.status === 0) throw errorDeEstado(0);

  const secciones: SeccionMusica[] = [
    { titulo: "Escuchado hace poco", items: enReciente },
    { titulo: "Tus más escuchadas", items: enTop },
    { titulo: "Novedades: álbumes recién salidos", items: novedades.status === 200 ? sinNulos(novedades.data?.albums?.items).map(deAlbum) : [] },
    ...semillas.map((a, i): SeccionMusica => ({ titulo: `Más de ${a}`, items: (resto[i] as MusicItem[]) ?? [] })),
    ...generos.map((g, i): SeccionMusica => ({ titulo: `Descubre: ${g.nombre}`, items: (resto[semillas.length + i] as MusicItem[]) ?? [] })),
  ];
  return { secciones: secciones.filter((s) => s.items.length > 0), permisosExtra };
}

/** Invitado (sin cuenta): el catálogo de sugeridos, pero mezclado y repartido en renglones distintos cada vez. */
function inicioInvitado(): SeccionMusica[] {
  const mezcla = azar(DEMO_MUSIC, DEMO_MUSIC.length);
  const de = (k: MusicItem["kind"]) => mezcla.filter((m) => m.kind === k);
  return [
    { titulo: "Para concentrarte y relajarte", items: de("playlist") },
    { titulo: "Canciones para escuchar", items: de("track") },
    { titulo: "Álbumes", items: de("album") },
    { titulo: "Artistas", items: de("artist") },
  ].filter((s) => s.items.length > 0);
}

function soloCanciones(secciones: SeccionMusica[]): MusicItem[] {
  return sinRepetir(secciones.flatMap((s) => s.items).filter((i) => i.kind === "track"));
}

/**
 * Contenido del módulo Música:
 * - sin texto: renglones de sugeridos, distintos cada vez (conectado: lo que escuchas, novedades y descubrimientos);
 * - un enlace o URI de Spotify: se resuelve a su canción/álbum/playlist (sin credenciales);
 * - texto, conectado: búsqueda en todo Spotify con el token de tu propia cuenta;
 * - texto, invitado: filtra los sugeridos (buscar todo el catálogo sin conectarse necesitaría un
 *   secreto de aplicación, que nunca debe viajar dentro de NexusHub).
 */
export async function cargarCatalogo(query: string, conectado: boolean): Promise<ResultadoCatalogo> {
  const q = query.trim();
  if (!q) {
    if (!conectado) {
      const secciones = inicioInvitado();
      return { heading: "Sugeridos para escuchar", items: soloCanciones(secciones), secciones };
    }
    const { secciones, permisosExtra } = await inicioConectado();
    // Si Spotify no dio nada (permisos o límites), al menos los sugeridos de siempre, pero mezclados.
    if (secciones.length === 0) {
      const respaldo = inicioInvitado();
      return { heading: "Sugeridos para escuchar", items: soloCanciones(respaldo), secciones: respaldo, permisosExtra };
    }
    return { heading: "Para ti", items: soloCanciones(secciones), secciones, permisosExtra };
  }

  const ref = parseSpotifyLink(q);
  if (ref) {
    const item = await resolveLink(ref);
    return { heading: "Enlace de Spotify", items: item.kind === "track" ? [item] : [], secciones: [{ titulo: "Enlace de Spotify", items: [item] }] };
  }

  if (conectado) {
    const secciones = await buscarConectado(q);
    return { heading: `Resultados para «${q}»`, items: soloCanciones(secciones), secciones };
  }

  const terminos = normalize(q).split(/\s+/).filter(Boolean);
  const items = DEMO_MUSIC.filter((m) => terminos.every((t) => normalize(`${m.title} ${m.subtitle}`).includes(t)));
  const titulo = `Sugeridos que coinciden con «${q}»`;
  return { heading: titulo, items: items.filter((i) => i.kind === "track"), secciones: items.length ? [{ titulo, items }] : [] };
}
