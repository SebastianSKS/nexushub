import { XMLParser } from "fast-xml-parser";
import { ID_VIDEO } from "@/lib/canales/ids";
import type { TipoCanal, VideoCanal } from "@/types/canal";
import { ErrorApi } from "./errores";
import { getTextoYouTube } from "./http";
import { feedDesdePagina } from "./pagina";

const TTL_FEED_MS = 15 * 60 * 1000;
const MAX_CACHE = 300;

interface FeedParseado {
  nombre: string;
  videos: VideoCanal[];
}

/** Caché en memoria de esta pestaña: dura mientras Nexo esté abierto. */
const cache = new Map<string, { at: number; value: FeedParseado }>();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false, // "2024" como título debe seguir siendo texto
  trimValues: true,
});

const arreglo = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const texto = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "object" && v !== null && "#text" in v ? String((v as { "#text": unknown })["#text"]) : "";

export function urlFeed(id: string, tipo: TipoCanal): string {
  const param = tipo === "canal" ? "channel_id" : "playlist_id";
  return `https://www.youtube.com/feeds/videos.xml?${param}=${encodeURIComponent(id)}`;
}

/** Atom de YouTube → nombre + videos normalizados. */
export function parsearFeed(xml: string): FeedParseado {
  const doc = parser.parse(xml) as { feed?: Record<string, unknown> };
  const feed = doc.feed;
  if (!feed) throw new ErrorApi("YouTube devolvió un feed que no se pudo leer.", undefined, "FEED_INVALIDO");

  const videos: VideoCanal[] = [];
  for (const raw of arreglo(feed.entry as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
    const videoId = texto(raw["yt:videoId"]);
    if (!ID_VIDEO.test(videoId)) continue;
    const autor = raw.author as { name?: unknown } | undefined;
    videos.push({
      videoId,
      titulo: texto(raw.title) || "(sin título)",
      canalId: texto(raw["yt:channelId"]),
      canalNombre: texto(autor?.name),
      publicado: texto(raw.published),
      miniatura: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      incrustable: true,
    });
  }
  return { nombre: texto(feed.title), videos };
}

/** Feed RSS oficial de YouTube: la primera opción (trae la fecha exacta de cada video). */
async function feedDesdeRss(id: string, tipo: TipoCanal): Promise<FeedParseado> {
  const res = await getTextoYouTube(urlFeed(id, tipo), { timeoutMs: 10_000 });
  if (res.status === 404 || res.status === 400) {
    throw new ErrorApi(
      tipo === "canal" ? "Ese canal no existe o ya no tiene videos públicos." : "Esa lista de reproducción no existe o es privada.",
      "Revisa el enlace, o abre el canal en YouTube y copia la dirección desde la barra del navegador.",
      "FEED_NO_ENCONTRADO",
    );
  }
  if (res.status !== 200) {
    throw new ErrorApi("YouTube no pudo entregar los videos de este canal.", "Inténtalo de nuevo en unos minutos.", "FEED_ERROR");
  }
  return parsearFeed(res.text);
}

/** Mientras dure, el RSS se da por roto y se va directo a la página del canal. */
let rssRotoHasta = 0;
const PAUSA_RSS_MS = 30 * 60 * 1000;

export interface ResultadoFeed extends FeedParseado {
  obtenidoEn: string;
  desdeCache: boolean;
}

function guardarEnCache(clave: string, value: FeedParseado) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(clave, { at: Date.now(), value });
}

/**
 * Descarga y parsea el feed de un canal o lista, con caché de 15 minutos en memoria.
 * Si YouTube falla y hay una copia vieja, se sirve esa antes que mostrar un error.
 */
export async function obtenerFeed(id: string, tipo: TipoCanal, opts: { fresco?: boolean } = {}): Promise<ResultadoFeed> {
  const clave = `${tipo}:${id}`;
  if (!opts.fresco) {
    const hit = cache.get(clave);
    if (hit && Date.now() - hit.at <= TTL_FEED_MS) return { ...hit.value, obtenidoEn: new Date().toISOString(), desdeCache: true };
  }

  try {
    let parseado: FeedParseado;
    if (Date.now() < rssRotoHasta) {
      parseado = await feedDesdePagina(id, tipo);
    } else {
      try {
        parseado = await feedDesdeRss(id, tipo);
      } catch (err) {
        // Sin red o sin respuesta, la página de YouTube tampoco va a contestar: se avisa tal cual.
        if (err instanceof ErrorApi && (err.codigo === "TIMEOUT" || err.codigo === "NETWORK")) throw err;
        // Cualquier otro fallo del RSS (404 incluido: hoy YouTube lo devuelve para canales que sí existen)
        // se comprueba en la página del canal. Si allí tampoco existe, el error es de verdad «no encontrado».
        parseado = await feedDesdePagina(id, tipo);
        rssRotoHasta = Date.now() + PAUSA_RSS_MS; // no se vuelve a probar el RSS durante un rato: ahorra una petición por canal
      }
    }
    guardarEnCache(clave, parseado);
    return { ...parseado, obtenidoEn: new Date().toISOString(), desdeCache: false };
  } catch (err) {
    const viejo = cache.get(clave);
    if (viejo && err instanceof ErrorApi && (err.codigo === "TIMEOUT" || err.codigo === "NETWORK" || err.codigo === "FEED_ERROR")) {
      return { ...viejo.value, obtenidoEn: new Date(viejo.at).toISOString(), desdeCache: true };
    }
    throw err;
  }
}
