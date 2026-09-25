import { useFavoritosStore } from "@/store/favoritos-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { spotifyApi } from "./api";
import { buscarCanciones } from "./catalogo";
import { pistaDeItem } from "./lista";

/**
 * «Tus mixes»: uno por cada artista que más escuchas. Al pulsarlo empieza a sonar una canción de ese artista y la
 * música sigue sola con canciones parecidas (la radio), así que cada mix suena distinto cada vez.
 */

export interface Mix {
  n: number;
  artista: string;
  imagen: string;
  /** Color del degradado de la tarjeta. */
  color: string;
}

const COLORES = ["#1f6feb", "#c2410c", "#7c3aed", "#0f766e", "#be185d", "#4d7c0f"];

interface ArtistaApi {
  name: string;
  images?: { url: string; width?: number }[];
}
const imagen = (a: ArtistaApi) => [...(a.images ?? [])].sort((x, y) => (y.width ?? 0) - (x.width ?? 0))[1]?.url ?? a.images?.[0]?.url ?? "";

export async function cargarMixes(cuantos = 5, alAzar = false): Promise<Mix[]> {
  const { status, data } = await spotifyApi<{ items: (ArtistaApi | null)[] }>("/me/top/artists?limit=10&time_range=medium_term");
  let artistas: ArtistaApi[] = status === 200 ? (data?.items ?? []).filter((a): a is ArtistaApi => !!a) : [];
  // «Otras sugerencias»: otros artistas y en otro orden, para que se note el cambio.
  if (alAzar) artistas = [...artistas].sort(() => Math.random() - 0.5);

  if (artistas.length < 3) {
    // Sin «lo más escuchado» de la cuenta: los artistas de lo que se ha reproducido y guardado en NexusHub.
    const f = useFavoritosStore.getState();
    f.cargar();
    const nombres = [...new Set([...f.favoritos, ...f.recientes].filter((p) => p.fuente === "spotify").map((p) => p.artista.split(/[,·]/)[0]!.trim()).filter((n) => n.length > 1))];
    const extra = nombres.filter((n) => !artistas.some((a) => a.name === n)).slice(0, cuantos - artistas.length);
    // Sin foto todavía: se busca cada artista para traer la suya.
    const conFoto = await Promise.all(
      extra.map(async (name): Promise<ArtistaApi> => {
        const r = await spotifyApi<{ artists?: { items: (ArtistaApi | null)[] } }>(`/search?${new URLSearchParams({ q: name, type: "artist", limit: "1" })}`);
        const a = r.status === 200 ? r.data?.artists?.items[0] : null;
        return a ?? { name };
      }),
    );
    artistas = [...artistas, ...conFoto];
  }
  return artistas.slice(0, cuantos).map((a, i) => ({ n: i + 1, artista: a.name, imagen: imagen(a), color: COLORES[i % COLORES.length]! }));
}

/** Empieza el mix: una canción conocida del artista (al azar entre las primeras) y, desde ahí, la radio. */
export async function iniciarMix(m: Mix): Promise<boolean> {
  const canciones = await buscarCanciones(`artist:"${m.artista}"`, 0);
  if (canciones.length === 0) return false;
  const semilla = canciones[Math.floor(Math.random() * Math.min(5, canciones.length))]!;
  useReproductorStore.getState().reproducir(pistaDeItem(semilla));
  return true;
}
