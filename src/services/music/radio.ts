import { useFavoritosStore } from "@/store/favoritos-store";
import type { Pista } from "@/store/reproductor-store";
import { spotifyApi } from "./api";
import { buscarCanciones } from "./catalogo";
import { cargarLista, pistaDeItem, type CancionLista } from "./lista";

/**
 * La «radio» de Nexo: al elegir una canción, la música sigue sola con canciones parecidas, como en Spotify.
 *
 * Spotify ya no da recomendaciones ni artistas relacionados a las aplicaciones nuevas, así que se parecen por
 * coincidencia: se buscan playlists de personas que tienen esa canción o a ese artista, se leen sus canciones y
 * suenan primero las que más se repiten en varias de ellas (lo que se escucha junto, se parece). Si eso falla,
 * se recurre a más canciones del mismo artista.
 */

const PLAYLISTS_A_LEER = 6;
const MAX_POR_ARTISTA = 2;

/** Las canciones de cada playlist leída, guardadas durante la sesión: dos peticiones seguidas no la vuelven a bajar. */
const memoria = new Map<string, Promise<CancionLista[]>>();

function leerPlaylist(id: string): Promise<CancionLista[]> {
  let p = memoria.get(id);
  if (!p) {
    p = cargarLista("playlist", id).then(
      (l) => l.canciones.filter((c) => c.reproducible),
      () => [],
    );
    memoria.set(id, p);
  }
  return p;
}

interface ListaBusqueda {
  playlists?: { items: ({ id: string } | null)[] };
}

async function playlistsDe(consulta: string): Promise<string[]> {
  const { status, data } = await spotifyApi<ListaBusqueda>(`/search?${new URLSearchParams({ q: consulta, type: "playlist", limit: "10" })}`);
  return status === 200 ? (data?.playlists?.items ?? []).filter((p): p is { id: string } => !!p).map((p) => p.id) : [];
}

const primerArtista = (subtitulo: string) => subtitulo.split(/[,·]/)[0]!.trim();

/** Lo que ya sonó hace poco o está en la cola: no se vuelve a proponer. */
function yaSonadas(cola: readonly Pista[]): Set<string> {
  const s = new Set(cola.map((c) => c.id));
  const fav = useFavoritosStore.getState();
  fav.cargar();
  for (const p of fav.recientes) if (p.fuente === "spotify") s.add(p.id);
  return s;
}

/** Devuelve hasta `cuantas` canciones parecidas a la semilla, en el orden en que conviene que suenen. */
export async function radioDe(semilla: Pista, cola: readonly Pista[], cuantas = 12): Promise<Pista[]> {
  const excluir = yaSonadas(cola);
  excluir.add(semilla.id);
  const artistaSemilla = primerArtista(semilla.artista);
  const titulo = semilla.titulo.split(/ - /)[0]!.trim();

  // 1) Playlists con esta canción o con este artista.
  const [conCancion, conArtista] = await Promise.all([playlistsDe(`${titulo} ${artistaSemilla}`), playlistsDe(artistaSemilla)]);
  const ids = [...new Set([...conCancion.slice(0, 4), ...conArtista.slice(0, 4)])].slice(0, PLAYLISTS_A_LEER);
  const listas = await Promise.all(ids.map(leerPlaylist));

  // 2) Cuánto pesa cada canción: cuántas de esas playlists la tienen (y más si la playlist también tiene la semilla).
  const peso = new Map<string, { c: CancionLista; w: number }>();
  for (const canciones of listas) {
    const tieneSemilla = canciones.some((c) => c.id === semilla.id);
    for (const c of canciones) {
      if (excluir.has(c.id)) continue;
      const w = 1 + (tieneSemilla ? 2 : 0);
      const actual = peso.get(c.id);
      if (actual) actual.w += w;
      else peso.set(c.id, { c, w });
    }
  }

  // 3) Las de más peso primero, pero con un poco de azar dentro de cada nivel, y sin abusar de un mismo artista.
  const ordenadas = [...peso.values()].map((x) => ({ ...x, k: x.w + Math.random() * 1.5 })).sort((a, b) => b.k - a.k);
  const porArtista = new Map<string, number>();
  const elegidas: Pista[] = [];
  for (const { c } of ordenadas) {
    const a = primerArtista(c.artista).toLowerCase();
    const n = porArtista.get(a) ?? 0;
    const tope = a === artistaSemilla.toLowerCase() ? 1 : MAX_POR_ARTISTA;
    if (n >= tope) continue;
    porArtista.set(a, n + 1);
    elegidas.push({ id: c.id, titulo: c.titulo, artista: c.artista, caratula: "", duracion: c.duracion, fuente: "spotify" });
    if (elegidas.length >= cuantas) break;
  }
  if (elegidas.length >= Math.min(6, cuantas)) return elegidas;

  // 4) Poco material (playlists ilegibles o casi vacías): más del mismo artista, para que la música no pare.
  const paginas = await Promise.all([0, 10].map((offset) => buscarCanciones(`artist:"${artistaSemilla}"`, offset)));
  const vistas = new Set([...excluir, ...elegidas.map((e) => e.id)]);
  const extra = paginas
    .flat()
    .map(pistaDeItem)
    .filter((p) => (vistas.has(p.id) ? false : (vistas.add(p.id), true)))
    .sort(() => Math.random() - 0.5);
  return [...elegidas, ...extra].slice(0, cuantas);
}
