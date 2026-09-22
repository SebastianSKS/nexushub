import { esEscritorio } from "./entorno";

/**
 * Capa de red única para hablar con servicios externos (YouTube, Spotify) SIN servidor propio.
 *
 *  - En la aplicación de escritorio (Tauri) se usa @tauri-apps/plugin-http: la petición sale por Rust
 *    y no está sujeta a CORS.
 *  - En el navegador (`npm run dev`) el navegador sí aplica CORS, así que las peticiones pasan por un
 *    proxy de desarrollo (rewrites de next.config.mjs). Ese proxy NO existe en la compilación final.
 */

const PROXY_DEV: { host: string; prefijo: string }[] = [
  { host: "www.youtube.com", prefijo: "/proxy/youtube" },
  { host: "open.spotify.com", prefijo: "/proxy/spotify-open" },
  { host: "i.scdn.co", prefijo: "/proxy/scdn" },
  { host: "image-cdn-ak.spotifycdn.com", prefijo: "/proxy/spotifycdn" },
];

function viaProxyDev(url: string): string {
  const u = new URL(url);
  const p = PROXY_DEV.find((x) => x.host === u.hostname);
  return p ? `${p.prefijo}${u.pathname}${u.search}` : url;
}

export interface RespuestaTexto {
  status: number;
  text: string;
}

/** fetch a un servicio externo, con tiempo máximo. Devuelve la respuesta cruda (incluye 401, 404…). */
export async function fetchExterno(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10_000, ...resto } = init;
  const opciones: RequestInit = { ...resto, signal: resto.signal ?? AbortSignal.timeout(timeoutMs) };

  if (esEscritorio()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch(url, opciones);
  }
  return fetch(viaProxyDev(url), opciones);
}

export async function getTexto(url: string, opts: { timeoutMs?: number } = {}): Promise<RespuestaTexto> {
  const res = await fetchExterno(url, { cache: "no-store", ...opts });
  return { status: res.status, text: await res.text() };
}

/** Descarga una imagen como Blob (para leer sus píxeles sin que el canvas quede "contaminado" por CORS). */
export async function getBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetchExterno(url, { timeoutMs: 8000 });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}
