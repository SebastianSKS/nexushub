import { T, traducir } from "@/lib/i18n";
import { ID_CANAL, ID_LISTA, ID_VIDEO } from "./ids";

/** Lo que el usuario pegó, ya clasificado. */
export type Entrada =
  | { tipo: "canal-id"; id: string }
  | { tipo: "lista"; id: string }
  | { tipo: "video"; id: string }
  /** Página de canal (@handle, /c/, /user/, nombre personalizado): hay que leer su HTML. */
  | { tipo: "pagina"; url: string };

export type EntradaAnalizada = { entrada: Entrada } | { error: string };

export const MENSAJE_NO_ENCONTRADO =
  T("No encontré ese canal. Revisa el enlace o abre el canal en YouTube y copia la dirección desde la barra del navegador.");

const HOSTS_YOUTUBE = /^(?:[\w-]+\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;
export const esHostYouTube = (host: string): boolean => HOSTS_YOUTUBE.test(host);

const RESERVADAS = new Set([
  "feed", "results", "watch", "playlist", "shorts", "gaming", "music", "premium", "hashtag", "account", "channel",
  "embed", "live", "v", "c", "user", "about", "howyoutubeworks", "t", "kids", "reporthistory", "yt", "attribution_link",
]);

/**
 * Clasifica el texto pegado. Acepta:
 *   @handle · UCxxxxxxxxxxxxxxxxxxxxxx · youtube.com/@handle · /channel/UC… · /c/Nombre · /user/Nombre
 *   /playlist?list=… · watch?v=… · youtu.be/… · /shorts/… · /live/… · /embed/… · youtube.com/NombrePersonalizado
 */
export function analizarEntrada(crudo: string): EntradaAnalizada {
  const t = crudo.trim().replace(/^[\s"'<(]+|[\s"'>)]+$/g, "");
  if (!t) return { error: traducir("Escribe o pega el enlace de un canal de YouTube.") };

  if (ID_CANAL.test(t)) return { entrada: { tipo: "canal-id", id: t } };
  if (/^@[^\s/?#]{1,100}$/.test(t)) {
    return { entrada: { tipo: "pagina", url: `https://www.youtube.com/${encodeURI(t)}` } };
  }

  // Sin esquema ("youtube.com/@x", "www.youtube.com/...", "youtu.be/...") → se añade https://
  const conEsquema = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : /^(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i.test(t) ? `https://${t}` : null;
  if (!conEsquema) {
    return { error: traducir("Eso no parece un enlace de YouTube. Pega la dirección de un canal, de una lista o de un video.") };
  }

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return { error: traducir("Ese enlace no está bien escrito. Cópialo de nuevo desde la barra de direcciones de YouTube.") };
  }
  if (!esHostYouTube(url.hostname)) {
    return { error: traducir("Ese enlace no es de YouTube. Pega la dirección de un canal, de una lista o de un video.") };
  }

  const seg = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  const primero = seg[0] ?? "";
  const origen = "https://www.youtube.com";

  // youtu.be/VIDEO
  if (/^youtu\.be$/i.test(url.hostname)) {
    return ID_VIDEO.test(primero) ? { entrada: { tipo: "video", id: primero } } : { error: traducir(MENSAJE_NO_ENCONTRADO) };
  }

  if (primero === "channel") {
    return ID_CANAL.test(seg[1] ?? "") ? { entrada: { tipo: "canal-id", id: seg[1]! } } : { error: traducir(MENSAJE_NO_ENCONTRADO) };
  }

  const lista = url.searchParams.get("list");
  if (primero === "playlist") {
    return lista && ID_LISTA.test(lista) ? { entrada: { tipo: "lista", id: lista } } : { error: traducir(MENSAJE_NO_ENCONTRADO) };
  }

  if (primero === "watch") {
    const v = url.searchParams.get("v");
    if (v && ID_VIDEO.test(v)) return { entrada: { tipo: "video", id: v } };
    if (lista && ID_LISTA.test(lista)) return { entrada: { tipo: "lista", id: lista } };
    return { error: traducir(MENSAJE_NO_ENCONTRADO) };
  }

  if (["shorts", "embed", "live", "v"].includes(primero)) {
    return ID_VIDEO.test(seg[1] ?? "") ? { entrada: { tipo: "video", id: seg[1]! } } : { error: traducir(MENSAJE_NO_ENCONTRADO) };
  }

  if (primero.startsWith("@")) return { entrada: { tipo: "pagina", url: `${origen}/${encodeURI(primero)}` } };

  if ((primero === "c" || primero === "user") && seg[1]) {
    return { entrada: { tipo: "pagina", url: `${origen}/${primero}/${encodeURIComponent(seg[1])}` } };
  }

  // Nombre personalizado antiguo: youtube.com/NombreDelCanal
  if (primero && !RESERVADAS.has(primero.toLowerCase())) {
    return { entrada: { tipo: "pagina", url: `${origen}/${encodeURIComponent(primero)}` } };
  }

  return { error: traducir("Ese enlace de YouTube no apunta a un canal, una lista ni un video. Abre el canal y copia su dirección.") };
}
