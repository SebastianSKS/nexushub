import { analizarEntrada, MENSAJE_NO_ENCONTRADO, type Entrada } from "@/lib/canales/entrada";
import { traducir } from "@/lib/i18n";
import { ID_CANAL } from "@/lib/canales/ids";
import type { CanalResuelto } from "@/types/canal";
import { ErrorApi } from "./errores";
import { obtenerFeed } from "./feed";
import { getTextoYouTube } from "./http";

const CLAVE_MAPA = "nexushub-canales-resueltos";
const MAX_ENTRADAS = 500;

// --- Mapeo enlace → canal, guardado para siempre: un channel_id no cambia nunca -----------------
function leerMapa(): Map<string, CanalResuelto> {
  try {
    const crudo = window.localStorage.getItem(CLAVE_MAPA);
    return crudo ? new Map(Object.entries(JSON.parse(crudo) as Record<string, CanalResuelto>)) : new Map();
  } catch {
    return new Map();
  }
}
let mapa: Map<string, CanalResuelto> | null = null;
let pendiente: ReturnType<typeof setTimeout> | undefined;

function guardarMapa(m: Map<string, CanalResuelto>) {
  clearTimeout(pendiente);
  pendiente = setTimeout(() => {
    try {
      // Se recorta a las más recientes si crece demasiado (localStorage tiene poco espacio).
      const entradas = [...m.entries()];
      const recortado = entradas.length > MAX_ENTRADAS ? entradas.slice(entradas.length - MAX_ENTRADAS) : entradas;
      window.localStorage.setItem(CLAVE_MAPA, JSON.stringify(Object.fromEntries(recortado)));
    } catch {
      /* sin almacenamiento: el mapeo dura solo esta sesión */
    }
  }, 400);
}
function mapaPermanente() {
  mapa ??= leerMapa();
  return {
    get: (k: string) => mapa!.get(k),
    set: (k: string, v: CanalResuelto) => {
      mapa!.set(k, v);
      guardarMapa(mapa!);
    },
  };
}

const noEncontrado = () => new ErrorApi(traducir(MENSAJE_NO_ENCONTRADO), traducir("Prueba con la dirección del canal (youtube.com/@nombre) o pega el enlace de cualquiera de sus videos."), "CANAL_NO_ENCONTRADO");

// --- Extracción del ID desde el HTML de la página del canal ------------------------------------
// Orden: canonical → itemprop → "channelId". El último es el menos fiable: en páginas reales
// devolvió el ID de OTRO canal (uno destacado o relacionado), por eso solo se usa si los demás fallan
// y su resultado se valida contra el feed.
const PATRONES = [
  { nombre: "canonical", re: /<link rel="canonical" href="[^"]*\/channel\/(UC[\w-]{22})"/ },
  { nombre: "itemprop", re: /<meta itemprop="identifier" content="(UC[\w-]{22})"/ },
  { nombre: "channelId", re: /"channelId":"(UC[\w-]{22})"/ },
] as const;

export function extraerIdDeHtml(html: string): { id: string; via: (typeof PATRONES)[number]["nombre"] } | null {
  for (const p of PATRONES) {
    const m = p.re.exec(html);
    if (m?.[1]) return { id: m[1], via: p.nombre };
  }
  return null;
}

const meta = (html: string, prop: string) => new RegExp(`<meta property="og:${prop}" content="([^"]*)"`).exec(html)?.[1];
const decodificar = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const HOSTS_AVATAR = /^https:\/\/(?:yt3\.googleusercontent\.com|yt3\.ggpht\.com|i\.ytimg\.com)\//;

/** Avatar de 96 px (se ve a 32 px con margen para pantallas de alta densidad). */
export function avatarDe(html: string): string | null {
  const og = meta(html, "image");
  if (!og) return null;
  const url = decodificar(og);
  if (!HOSTS_AVATAR.test(url)) return null;
  if (!/yt3\./.test(url)) return url;
  const base = url.replace(/=s\d+[^/]*$/, "");
  return `${base}=s96-c-k-c0x00ffffff-no-rj`;
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Completa nombre y avatar de un canal cuyo ID ya se conoce. */
async function completarCanal(id: string, htmlPagina?: string, confirmarNombre = false): Promise<CanalResuelto> {
  const feed = await obtenerFeed(id, "canal").catch((err) => {
    if (err instanceof ErrorApi && err.codigo === "FEED_NO_ENCONTRADO") throw noEncontrado();
    throw err;
  });

  let html = htmlPagina;
  if (!html) {
    const res = await getTextoYouTube(`https://www.youtube.com/channel/${id}`, { navegador: true }).catch(() => null);
    html = res?.status === 200 ? res.text : undefined;
  }

  const nombreHtml = html ? meta(html, "title") : undefined;
  const nombre = decodificar(nombreHtml ?? "") || feed.videos[0]?.canalNombre || feed.nombre || traducir("Canal de YouTube");

  // Si el ID salió del patrón menos fiable, el nombre del feed debe coincidir con el de la página.
  if (confirmarNombre && nombreHtml) {
    const autor = feed.videos[0]?.canalNombre ?? feed.nombre;
    if (sinAcentos(autor) !== sinAcentos(decodificar(nombreHtml))) throw noEncontrado();
  }

  return { id, nombre, avatar: html ? avatarDe(html) : null, tipo: "canal" };
}

async function desdePagina(url: string): Promise<CanalResuelto> {
  const res = await getTextoYouTube(url, { navegador: true });
  if (res.status === 404 || res.status === 400) throw noEncontrado();
  if (res.status !== 200) {
    throw new ErrorApi(traducir("YouTube no respondió al buscar ese canal."), traducir("Inténtalo de nuevo en unos segundos."), "PAGINA_ERROR");
  }
  const hallado = extraerIdDeHtml(res.text);
  if (!hallado) throw noEncontrado();
  return completarCanal(hallado.id, res.text, hallado.via === "channelId");
}

async function desdeLista(id: string): Promise<CanalResuelto> {
  const feed = await obtenerFeed(id, "lista").catch((err) => {
    if (err instanceof ErrorApi && err.codigo === "FEED_NO_ENCONTRADO") throw noEncontrado();
    throw err;
  });
  const primero = feed.videos[0];
  return { id, nombre: feed.nombre || traducir("Lista de reproducción"), avatar: primero ? `https://i.ytimg.com/vi/${primero.videoId}/mqdefault.jpg` : null, tipo: "lista" };
}

/**
 * Un video cuya incrustación está desactivada responde 401/403 a oEmbed y no trae author_url,
 * pero el video existe. En ese caso el canal se lee de la página del propio video.
 */
async function autorDesdePaginaDeVideo(videoId: string): Promise<string | undefined> {
  const res = await getTextoYouTube(`https://www.youtube.com/watch?v=${videoId}`, { navegador: true });
  if (res.status !== 200) return undefined;
  const crudo = /"ownerProfileUrl":"([^"]+)"/.exec(res.text)?.[1] ?? /<link itemprop="url" href="(https?:\/\/www\.youtube\.com\/@[^"]+)"/.exec(res.text)?.[1];
  if (!crudo) return undefined;
  try {
    return (JSON.parse(`"${crudo}"`) as string).replace(/^http:/, "https:");
  } catch {
    return crudo.replace(/^http:/, "https:");
  }
}

/** Video → oEmbed → author_url → canal (con respaldo en la página del video si oEmbed lo niega). */
async function desdeVideo(videoId: string): Promise<CanalResuelto> {
  const res = await getTextoYouTube(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`);
  let autorUrl: string | undefined;
  if (res.status === 200) {
    try {
      autorUrl = (JSON.parse(res.text) as { author_url?: string }).author_url;
    } catch {
      autorUrl = undefined;
    }
  } else if (res.status === 401 || res.status === 403) {
    autorUrl = await autorDesdePaginaDeVideo(videoId);
  }
  if (!autorUrl) throw noEncontrado();

  const analizado = analizarEntrada(autorUrl);
  if ("error" in analizado || analizado.entrada.tipo === "video" || analizado.entrada.tipo === "lista") throw noEncontrado();
  return resolverEntradaClasificada(analizado.entrada);
}

async function resolverEntradaClasificada(e: Entrada): Promise<CanalResuelto> {
  switch (e.tipo) {
    case "canal-id":
      return completarCanal(e.id);
    case "lista":
      return desdeLista(e.id);
    case "video":
      return desdeVideo(e.id);
    case "pagina":
      return desdePagina(e.url);
  }
}

/**
 * Resuelve lo que el usuario pegó a un canal o lista. El mapeo entrada → canal se guarda
 * para siempre en este equipo: un channel_id no cambia nunca, así que no hay motivo para
 * volver a preguntarle a YouTube.
 */
export async function resolverCanal(crudo: string): Promise<CanalResuelto> {
  const permanente = mapaPermanente();
  const clave = crudo.trim().toLowerCase();
  const guardado = permanente.get(clave);
  if (guardado) return guardado;

  const analizado = analizarEntrada(crudo);
  if ("error" in analizado) throw new ErrorApi(analizado.error, undefined, "ENTRADA_INVALIDA");

  const canal = await resolverEntradaClasificada(analizado.entrada);
  if (canal.tipo === "canal" && !ID_CANAL.test(canal.id)) throw noEncontrado();

  permanente.set(clave, canal);
  permanente.set(canal.id.toLowerCase(), canal);
  return canal;
}
