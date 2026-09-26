/**
 * Respaldo para cuando el feed RSS de YouTube falla (desde 2026 responde 404 para casi cualquier canal):
 * la propia página web del canal (pestaña «Videos») trae los videos dentro de un bloque JSON,
 * `ytInitialData`. No es una API oficial: si YouTube cambia su página, esto puede dejar de funcionar y
 * habrá que ajustarlo; por eso el RSS sigue siendo la primera opción y esto solo se usa si falla.
 */
import { traducir } from "@/lib/i18n";
import { ID_VIDEO } from "@/lib/canales/ids";
import type { TipoCanal, VideoCanal } from "@/types/canal";
import { ErrorApi } from "./errores";
import { getTextoYouTube } from "./http";

const MARCAS = ["var ytInitialData = ", 'window["ytInitialData"] = '];

/** Saca el JSON `ytInitialData` incrustado en el HTML de una página de YouTube. */
export function extraerDatosIniciales(html: string): unknown | null {
  for (const marca of MARCAS) {
    const inicio = html.indexOf(marca);
    if (inicio < 0) continue;
    const desde = inicio + marca.length;
    const fin = html.indexOf(";</script>", desde);
    if (fin < 0) continue;
    try {
      return JSON.parse(html.slice(desde, fin));
    } catch {
      /* siguiente marca */
    }
  }
  return null;
}

const MS = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5, mo: 2592e6, y: 31536e6 } as const;

/** «5d ago», «1mo ago», «3 weeks ago», «Streamed 2 hours ago» → instante aproximado (ms). null si no se entiende. */
export function fechaDesdeRelativo(texto: string, ahora: number): number | null {
  if (!/ago/i.test(texto)) return null;
  const m = /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|mos?|years?|yrs?|mo|[smhdwy])\b/i.exec(texto);
  if (!m) return null;
  const u = m[2]!.toLowerCase();
  const clave = u.startsWith("mo") ? "mo" : u.startsWith("y") ? "y" : u.startsWith("w") ? "w" : u.startsWith("d") ? "d" : u.startsWith("h") ? "h" : u.startsWith("s") ? "s" : "m";
  return ahora - Number(m[1]) * MS[clave];
}

type Json = { [k: string]: unknown };
const esObjeto = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (!esObjeto(v)) return "";
  if (typeof v.simpleText === "string") return v.simpleText;
  if (typeof v.content === "string") return v.content;
  if (Array.isArray(v.runs)) return v.runs.map((r) => (esObjeto(r) && typeof r.text === "string" ? r.text : "")).join("");
  return "";
};

interface Bruto {
  videoId: string;
  titulo: string;
  relativo: string;
  autor: string;
}

/** Recorre el JSON y junta cada video que encuentre, sea cual sea el diseño de página que use YouTube. */
function recolectar(datos: unknown): Bruto[] {
  const salida: Bruto[] = [];
  const vistos = new Set<string>();
  const agregar = (b: Bruto) => {
    if (!ID_VIDEO.test(b.videoId) || vistos.has(b.videoId)) return;
    vistos.add(b.videoId);
    salida.push(b);
  };

  (function recorrer(o: unknown): void {
    if (Array.isArray(o)) return o.forEach(recorrer);
    if (!esObjeto(o)) return;

    // Diseño nuevo: lockupViewModel (canales y listas).
    if (esObjeto(o.lockupViewModel) && o.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const l = o.lockupViewModel;
      const meta = esObjeto(l.metadata) && esObjeto(l.metadata.lockupMetadataViewModel) ? l.metadata.lockupMetadataViewModel : {};
      const filas = esObjeto(meta.metadata) && esObjeto(meta.metadata.contentMetadataViewModel) && Array.isArray(meta.metadata.contentMetadataViewModel.metadataRows) ? meta.metadata.contentMetadataViewModel.metadataRows : [];
      const partes = filas.flatMap((f) => (esObjeto(f) && Array.isArray(f.metadataParts) ? f.metadataParts.map((p) => (esObjeto(p) ? texto(p.text) : "")) : []));
      agregar({
        videoId: String(l.contentId ?? ""),
        titulo: texto(meta.title),
        relativo: partes.find((p) => /ago/i.test(p)) ?? "",
        autor: filas.length > 1 && partes[0] && !/ago|view/i.test(partes[0]) ? partes[0] : "",
      });
      return;
    }

    // Diseños anteriores.
    const r = esObjeto(o.videoRenderer) ? o.videoRenderer : esObjeto(o.gridVideoRenderer) ? o.gridVideoRenderer : esObjeto(o.playlistVideoRenderer) ? o.playlistVideoRenderer : null;
    if (r) {
      agregar({
        videoId: String(r.videoId ?? ""),
        titulo: texto(r.title),
        relativo: texto(r.publishedTimeText) || (texto(r.videoInfo).split("•").map((s) => s.trim()).find((s) => /ago/i.test(s)) ?? ""),
        autor: texto(r.shortBylineText) || texto(r.ownerText),
      });
      return;
    }
    Object.values(o).forEach(recorrer);
  })(datos);
  return salida;
}

/** ytInitialData → nombre + videos, en el mismo formato que devuelve el lector del RSS. */
export function parsearPagina(datos: unknown, id: string, tipo: TipoCanal, ahora = Date.now()): { nombre: string; videos: VideoCanal[] } {
  const d = esObjeto(datos) ? datos : {};
  const metadata = esObjeto(d.metadata) ? d.metadata : {};
  const canalMeta = esObjeto(metadata.channelMetadataRenderer) ? metadata.channelMetadataRenderer : null;
  const listaMeta = esObjeto(metadata.playlistMetadataRenderer) ? metadata.playlistMetadataRenderer : null;
  const nombre = texto(canalMeta?.title) || texto(listaMeta?.title);

  const videos = recolectar(datos).map((b, i): VideoCanal => {
    const cuando = fechaDesdeRelativo(b.relativo, ahora);
    // Sin fecha legible, se conserva el orden de la página restando unos segundos por posición.
    const instante = cuando ?? ahora - i * 1000;
    return {
      videoId: b.videoId,
      titulo: b.titulo || traducir("(sin título)"),
      canalId: tipo === "canal" ? id : "",
      canalNombre: tipo === "canal" ? nombre : b.autor,
      publicado: new Date(instante - i).toISOString(), // -i ms: desempata videos del mismo día sin cambiar el orden
      miniatura: `https://i.ytimg.com/vi/${b.videoId}/hqdefault.jpg`,
      incrustable: true,
    };
  });
  return { nombre, videos };
}

/** Descarga la página del canal (pestaña Videos) o de la lista y saca sus videos. */
export async function feedDesdePagina(id: string, tipo: TipoCanal): Promise<{ nombre: string; videos: VideoCanal[] }> {
  const url = tipo === "canal" ? `https://www.youtube.com/channel/${encodeURIComponent(id)}/videos?hl=en` : `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}&hl=en`;
  const res = await getTextoYouTube(url, { navegador: true, timeoutMs: 15_000 });
  if (res.status === 404 || res.status === 400) {
    throw new ErrorApi(
      tipo === "canal" ? traducir("Ese canal no existe o ya no tiene videos públicos.") : traducir("Esa lista de reproducción no existe o es privada."),
      traducir("Revisa el enlace, o abre el canal en YouTube y copia la dirección desde la barra del navegador."),
      "FEED_NO_ENCONTRADO",
    );
  }
  if (res.status !== 200) throw new ErrorApi(traducir("YouTube no pudo entregar los videos de este canal."), traducir("Inténtalo de nuevo en unos minutos."), "FEED_ERROR");
  const datos = extraerDatosIniciales(res.text);
  if (!datos) throw new ErrorApi(traducir("YouTube no pudo entregar los videos de este canal."), traducir("Inténtalo de nuevo en unos minutos."), "FEED_ERROR");
  const resultado = parsearPagina(datos, id, tipo);
  // YouTube responde 200 con una página de «no existe» para IDs inventados: sin nombre ni videos, no hay canal.
  if (!resultado.nombre && resultado.videos.length === 0) {
    throw new ErrorApi(
      tipo === "canal" ? traducir("Ese canal no existe o ya no tiene videos públicos.") : traducir("Esa lista de reproducción no existe o es privada."),
      traducir("Revisa el enlace, o abre el canal en YouTube y copia la dirección desde la barra del navegador."),
      "FEED_NO_ENCONTRADO",
    );
  }
  return resultado;
}
