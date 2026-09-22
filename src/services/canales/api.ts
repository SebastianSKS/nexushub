import type { CanalResuelto, RespuestaVideos, ResultadoVerificacion, TipoCanal } from "@/types/canal";
import { obtenerFeed } from "./feed";
import { resolverCanal } from "./resolver";
import { verificarVideos } from "./verificar";

export { ErrorApi } from "./errores";

/** Texto pegado por el usuario → canal o lista. Se resuelve dentro de la aplicación, sin servidor. */
export async function resolverEntrada(entrada: string): Promise<CanalResuelto> {
  return resolverCanal(entrada);
}

/** Videos de un canal o lista, con caché de 15 minutos. */
export async function traerVideos(id: string, tipo: TipoCanal, fresco = false): Promise<RespuestaVideos> {
  const feed = await obtenerFeed(id, tipo, { fresco });
  return { id, nombre: feed.nombre, tipo, videos: feed.videos, obtenidoEn: feed.obtenidoEn, desdeCache: feed.desdeCache };
}

/** Verifica si cada video se puede incrustar, en lotes de 100 para no saturar la red. */
export async function verificarIncrustacion(videoIds: string[], fresco = false): Promise<ResultadoVerificacion[]> {
  const salida: ResultadoVerificacion[] = [];
  for (let i = 0; i < videoIds.length; i += 100) {
    salida.push(...(await verificarVideos(videoIds.slice(i, i + 100), { fresco })));
  }
  return salida;
}
