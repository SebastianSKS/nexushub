import type { Pista } from "@/store/reproductor-store";
import { buscarCanciones } from "./catalogo";
import { pistaDeItem } from "./lista";

/** El primer artista de «A, B · Álbum» (así vienen los subtítulos de las pistas de Spotify). */
export function artistaPrincipal(pista: Pick<Pista, "artista">): string {
  return pista.artista.split(/[,·]/)[0]!.trim();
}

/**
 * Canciones para que la música siga cuando se acaba la cola: más del mismo artista (y del segundo, si lo hay), sin
 * repetir nada de lo que ya está en la cola. Spotify no da recomendaciones a las aplicaciones nuevas, así que se
 * busca por artista; el resultado es «más de lo que estás escuchando», mezclado.
 */
export async function similaresA(pista: Pista, excluir: ReadonlySet<string>, cuantas = 10): Promise<Pista[]> {
  const nombres = [...new Set(pista.artista.split(/[,·]/).map((a) => a.trim()).filter((a) => a.length > 1))].slice(0, 2);
  if (nombres.length === 0) return [];
  const paginas = await Promise.all(nombres.flatMap((a) => [0, 10].map((offset) => buscarCanciones(`artist:"${a}"`, offset))));
  const vistas = new Set(excluir);
  const candidatas = paginas
    .flat()
    .map(pistaDeItem)
    .filter((p) => (vistas.has(p.id) ? false : (vistas.add(p.id), true)));
  // Un poco de mezcla para que no suene siempre el mismo orden, sin perder lo más popular del principio.
  const primeras = candidatas.slice(0, 4);
  const resto = candidatas.slice(4).sort(() => Math.random() - 0.5);
  return [...primeras, ...resto].slice(0, cuantas);
}
