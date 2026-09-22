import { fetchExterno } from "@/lib/red";
import { ID_VIDEO } from "@/lib/canales/ids";
import type { ResultadoVerificacion } from "@/types/canal";

const TTL_MS = 24 * 60 * 60 * 1000;
const CONCURRENCIA = 5;

/** Caché en memoria de esta pestaña. */
const cache = new Map<string, { at: number; value: ResultadoVerificacion }>();

/**
 * oEmbed decide si un video se puede incrustar:
 *   200 → sí · 401/403 → incrustación desactivada · 404/400 → no disponible.
 * (Un ID que no existe responde 400, no 404, por eso ambos cuentan como no disponible.)
 * Cualquier otra cosa (tiempo agotado, error del servidor, sin red) NO oculta el video: se asume incrustable.
 */
async function consultar(videoId: string): Promise<{ resultado: ResultadoVerificacion; definitivo: boolean }> {
  const permisivo = { resultado: { videoId, incrustable: true }, definitivo: false };
  try {
    const res = await fetchExterno(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`, {
      cache: "no-store",
      timeoutMs: 6000,
    });
    if (res.status === 200) return { resultado: { videoId, incrustable: true }, definitivo: true };
    if (res.status === 401 || res.status === 403) {
      return { resultado: { videoId, incrustable: false, motivo: "incrustacion_desactivada" }, definitivo: true };
    }
    if (res.status === 404 || res.status === 400) {
      return { resultado: { videoId, incrustable: false, motivo: "no_disponible" }, definitivo: true };
    }
    return permisivo;
  } catch {
    return permisivo;
  }
}

/** Verifica una lista de videos con como máximo 5 peticiones simultáneas; resultados cacheados 24 h. */
export async function verificarVideos(ids: string[], opts: { fresco?: boolean } = {}): Promise<ResultadoVerificacion[]> {
  const unicos = [...new Set(ids.filter((id) => ID_VIDEO.test(id)))];
  const resultados = new Map<string, ResultadoVerificacion>();
  const pendientes: string[] = [];

  for (const id of unicos) {
    const hit = opts.fresco ? undefined : cache.get(id);
    if (hit && Date.now() - hit.at <= TTL_MS) resultados.set(id, hit.value);
    else pendientes.push(id);
  }

  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < pendientes.length) {
      const id = pendientes[siguiente++]!;
      const { resultado, definitivo } = await consultar(id);
      resultados.set(id, resultado);
      if (definitivo) cache.set(id, { at: Date.now(), value: resultado });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, pendientes.length) }, trabajador));

  return unicos.map((id) => resultados.get(id)!);
}
