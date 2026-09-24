import { fetchExterno } from "@/lib/red";
import { crearChallenge, crearEstado, crearVerificador } from "@/lib/music/pkce";

/**
 * Inicio de sesión con Spotify, PKCE, TODO del lado del cliente: sin servidor propio y sin Client
 * Secret (el Secret nunca debe viajar dentro de la aplicación instalada). El Client ID no es un
 * secreto: Spotify lo espera público en cualquier app de escritorio o de una sola página.
 */

const CLAVE_PKCE = "nexushub-spotify-pkce";
const CLAVE_TOKENS = "nexushub-spotify-tokens";
const SCOPES = ["streaming", "user-read-email", "user-read-private", "user-read-playback-state", "user-modify-playback-state", "playlist-read-private", "playlist-read-collaborative", "user-top-read", "user-read-recently-played", "user-library-read", "user-library-modify", "playlist-modify-public", "playlist-modify-private"].join(" ");

interface Tokens {
  access_token: string;
  /** Milisegundos desde época. */
  expires_at: number;
  refresh_token?: string;
}

export function obtenerClientId(): string | null {
  return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.trim() || null;
}
export const clienteIdConfigurado = (): boolean => obtenerClientId() !== null;

/** Debe coincidir EXACTAMENTE con la registrada en el panel de la app de Spotify. */
export function redirectUri(): string {
  return process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI?.trim() || "http://127.0.0.1:3000/api/spotify/callback";
}

function leerTokens(): Tokens | null {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_TOKENS) ?? "null") as Tokens | null;
  } catch {
    return null;
  }
}
function guardarTokens(t: Tokens | null) {
  try {
    if (t) {
      window.localStorage.setItem(CLAVE_TOKENS, JSON.stringify(t));
      window.localStorage.removeItem("nexushub-spotify-cerrada");
    } else {
      window.localStorage.removeItem(CLAVE_TOKENS);
    }
  } catch {
    /* sin almacenamiento: la sesión dura solo esta pestaña */
  }
}

/** true si hay algo guardado (aunque haya expirado): sirve para decidir si vale la pena reconectar al abrir. */
export function haySesionSpotify(): boolean {
  return leerTokens() !== null;
}

/** Redirige a Spotify a iniciar sesión. Guarda el verificador PKCE para el regreso. */
export async function iniciarConexionSpotify(): Promise<void> {
  const clientId = obtenerClientId();
  if (!clientId) return;

  const verificador = crearVerificador();
  const estado = crearEstado();
  try {
    window.sessionStorage.setItem(CLAVE_PKCE, JSON.stringify({ v: verificador, s: estado }));
  } catch {
    /* sin almacenamiento: el regreso de Spotify fallará con un mensaje claro (estado no coincide) */
  }

  const autorizar = new URL("https://accounts.spotify.com/authorize");
  autorizar.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri(),
    state: estado,
    code_challenge_method: "S256",
    code_challenge: await crearChallenge(verificador),
  }).toString();
  window.location.href = autorizar.toString();
}

interface RespuestaToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Pide tokens a Spotify. Devuelve:
 *  - los tokens, si todo salió bien;
 *  - "rechazado" si Spotify contestó que el código o el refresh token ya no valen (HTTP 400/401): la sesión
 *    de verdad se acabó y hay que volver a iniciar sesión;
 *  - null si no se pudo saber (sin internet, tiempo agotado, Spotify caído…): la sesión guardada sigue
 *    siendo buena y se reintenta luego. Antes, cualquier fallo borraba la sesión: bastaba abrir NexusHub
 *    un momento sin conexión para tener que iniciar sesión otra vez.
 */
async function pedirTokens(cuerpo: Record<string, string>): Promise<RespuestaToken | "rechazado" | null> {
  const clientId = obtenerClientId();
  if (!clientId) return null;
  try {
    const res = await fetchExterno("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, ...cuerpo }),
      timeoutMs: 10_000,
    });
    if (res.status === 400 || res.status === 401) return "rechazado";
    if (!res.ok) return null;
    return (await res.json()) as RespuestaToken;
  } catch {
    return null;
  }
}

export type ResultadoCallback = "connected" | "denied" | "error" | "not-configured";

/** Llamado desde la página de retorno (/api/spotify/callback): intercambia el código por tokens. */
export async function procesarCallback(params: URLSearchParams): Promise<ResultadoCallback> {
  if (!clienteIdConfigurado()) return "not-configured";
  if (params.get("error")) return "denied";

  const code = params.get("code");
  if (!code) return "error";

  let pkce: { v: string; s: string } | null = null;
  try {
    pkce = JSON.parse(window.sessionStorage.getItem(CLAVE_PKCE) ?? "null") as { v: string; s: string } | null;
  } catch {
    pkce = null;
  }
  window.sessionStorage.removeItem(CLAVE_PKCE);
  if (!pkce || params.get("state") !== pkce.s) return "error";

  const tokens = await pedirTokens({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: pkce.v });
  if (!tokens || tokens === "rechazado") return "error";

  guardarTokens({ access_token: tokens.access_token, expires_at: Date.now() + tokens.expires_in * 1000, refresh_token: tokens.refresh_token });
  return "connected";
}

/**
 * El access token vigente, renovándolo con el refresh token si hace falta. null = no hay sesión
 * (o Spotify la rechazó, en cuyo caso también se borra lo guardado). Si solo falló la conexión, la sesión
 * se conserva y este intento devuelve null.
 */
export async function obtenerAccessToken(): Promise<string | null> {
  const actuales = leerTokens();
  if (!actuales) return null;
  if (actuales.expires_at - 30_000 > Date.now()) return actuales.access_token;
  if (!actuales.refresh_token) {
    guardarTokens(null);
    return null;
  }
  const tokens = await pedirTokens({ grant_type: "refresh_token", refresh_token: actuales.refresh_token });
  if (tokens === "rechazado") {
    guardarTokens(null);
    return null;
  }
  if (!tokens) return null; // sin conexión o Spotify no contestó: no se toca la sesión
  const nuevos: Tokens = { access_token: tokens.access_token, expires_at: Date.now() + tokens.expires_in * 1000, refresh_token: tokens.refresh_token ?? actuales.refresh_token };
  guardarTokens(nuevos);
  return nuevos.access_token;
}

export function cerrarSesionSpotify(): void {
  guardarTokens(null);
  // Cerrar sesión a propósito: el respaldo automático no debe devolver los tokens (ver useRespaldoLocal).
  try {
    window.localStorage.setItem("nexushub-spotify-cerrada", "1");
  } catch {
    /* sin almacenamiento */
  }
}
