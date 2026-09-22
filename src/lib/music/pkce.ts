/** Utilidades del inicio de sesión OAuth con PKCE (Proof Key for Code Exchange) de Spotify. */

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Verificador aleatorio de 64 bytes (público: solo prueba que quien pide el token es quien inició el login). */
export function crearVerificador(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(64)));
}

/** SHA-256 del verificador, tal como exige el flujo PKCE. */
export async function crearChallenge(verificador: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador));
  return base64url(digest);
}

export function crearEstado(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)));
}
