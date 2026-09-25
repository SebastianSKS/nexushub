import { fetchExterno } from "@/lib/red";
import type { Pista } from "@/store/reproductor-store";

/**
 * Letras de las canciones, del servicio abierto y gratuito LRCLIB (lrclib.net): sin cuenta ni claves. Si la canción tiene
 * letra sincronizada, cada línea trae el segundo en que se canta y la interfaz la marca mientras suena.
 */

export interface LineaLetra {
  /** Segundo en que empieza la línea. */
  t: number;
  texto: string;
}

export interface Letra {
  /** Con tiempos, para marcar la línea que suena; null si solo hay el texto. */
  sincronizada: LineaLetra[] | null;
  /** El texto completo, sin tiempos. */
  plana: string | null;
}

interface RespuestaLrclib {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
  instrumental?: boolean;
}

const AGENTE = { "User-Agent": "NexusHub (https://github.com/SebastianSKS/nexushub)" };

/** «Canción - Remastered 2011», «Canción (feat. X)», «Canción - En vivo»: lo que estorba para encontrar la letra. */
function limpiarTitulo(t: string): string {
  return t.split(" - ")[0]!.replace(/\s*[([].*?[)\]]/g, "").trim() || t;
}

/** Convierte el formato LRC («[01:23.45] texto») en líneas con su segundo. */
export function leerLrc(lrc: string): LineaLetra[] {
  const lineas: LineaLetra[] = [];
  for (const cruda of lrc.split(/\r?\n/)) {
    const marcas = [...cruda.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (marcas.length === 0) continue;
    const texto = cruda.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of marcas) {
      const frac = m[3] ? Number(`0.${m[3]}`) : 0;
      lineas.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, texto });
    }
  }
  return lineas.sort((a, b) => a.t - b.t);
}

function aLetra(r: RespuestaLrclib): Letra | null {
  if (r.instrumental) return { sincronizada: null, plana: null };
  const sincronizada = r.syncedLyrics ? leerLrc(r.syncedLyrics) : null;
  const plana = r.plainLyrics?.trim() || null;
  if (!sincronizada?.length && !plana) return null;
  return { sincronizada: sincronizada?.length ? sincronizada : null, plana };
}

async function pedir<T>(ruta: string, params: Record<string, string>): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetchExterno(`https://lrclib.net/api/${ruta}?${new URLSearchParams(params)}`, { headers: AGENTE, timeoutMs: 10_000 });
    return { status: res.status, data: res.status === 200 ? ((await res.json()) as T) : null };
  } catch {
    return { status: 0, data: null };
  }
}

const memoria = new Map<string, Promise<Letra | null | "error">>();

/** Busca la letra de una canción. `null` = no hay; `"error"` = no se pudo consultar (sin internet). */
export function cargarLetra(pista: Pick<Pista, "id" | "titulo" | "artista" | "duracion">): Promise<Letra | null | "error"> {
  let p = memoria.get(pista.id);
  if (!p) {
    p = buscar(pista).then((r) => {
      if (r === "error") memoria.delete(pista.id); // que se pueda reintentar
      return r;
    });
    memoria.set(pista.id, p);
  }
  return p;
}

async function buscar(pista: Pick<Pista, "titulo" | "artista" | "duracion">): Promise<Letra | null | "error"> {
  const titulo = limpiarTitulo(pista.titulo);
  const artista = pista.artista.split(/[,·]/)[0]!.trim();
  const base: Record<string, string> = { track_name: titulo, artist_name: artista };
  if (pista.duracion > 0) base.duration = String(Math.round(pista.duracion));

  const exacta = await pedir<RespuestaLrclib>("get", base);
  if (exacta.status === 0) return "error";
  if (exacta.data) {
    const l = aLetra(exacta.data);
    if (l) return l;
  }

  // Sin coincidencia exacta: se busca y se elige la de duración más cercana (con tiempos, si la hay).
  const lista = await pedir<RespuestaLrclib[]>("search", { track_name: titulo, artist_name: artista });
  if (lista.status === 0) return "error";
  const candidatas = (lista.data ?? []).filter((r) => !pista.duracion || !r.duration || Math.abs(r.duration - pista.duracion) <= 6);
  const mejor = candidatas.find((r) => r.syncedLyrics) ?? candidatas.find((r) => r.plainLyrics);
  return mejor ? aLetra(mejor) : null;
}

/** La línea que suena en el segundo `t` (-1 si todavía no empieza la primera). */
export function lineaActual(lineas: readonly LineaLetra[], t: number): number {
  let lo = 0;
  let hi = lineas.length - 1;
  let r = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineas[mid]!.t <= t) {
      r = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return r;
}
