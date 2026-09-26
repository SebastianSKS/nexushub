import { fetchExterno } from "@/lib/red";
import { traducir } from "@/lib/i18n";
import { esHostYouTube } from "@/lib/canales/entrada";
import { ErrorApi } from "./errores";

/**
 * YouTube sirve una página de consentimiento a algunas visitas sin cookies; con estas cabeceras
 * responde normal. En la aplicación de escritorio (Tauri) salen tal cual, porque la petición la hace
 * Rust y no está sujeta a las cabeceras "prohibidas" del navegador; en el navegador, `User-Agent` y
 * `Cookie` las ignora el propio navegador por seguridad, así que ahí puede aparecer la página de aviso.
 */
const CABECERAS_NAVEGADOR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "es-MX,es;q=0.9,en;q=0.5",
  Cookie: "CONSENT=YES+1; SOCS=CAI",
};

export interface ResultadoHttp {
  status: number;
  text: string;
}

/**
 * GET a YouTube con tiempo máximo. Devuelve el estado HTTP tal cual (404, 401…) para que el llamador
 * decida; solo lanza si no hay respuesta en absoluto (sin red, tiempo agotado). Nunca consulta un
 * dominio que no sea de YouTube.
 */
export async function getTextoYouTube(url: string, opts: { timeoutMs?: number; navegador?: boolean } = {}): Promise<ResultadoHttp> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !esHostYouTube(parsed.hostname)) {
    throw new ErrorApi(traducir("Ese enlace no es de YouTube."), undefined, "NO_YOUTUBE");
  }
  try {
    const res = await fetchExterno(url, {
      headers: opts.navegador ? CABECERAS_NAVEGADOR : { "Accept-Language": CABECERAS_NAVEGADOR["Accept-Language"] },
      redirect: "follow",
      cache: "no-store",
      timeoutMs: opts.timeoutMs ?? 10_000,
    });
    // En el navegador de desarrollo la URL real pasa por el proxy local (127.0.0.1): esa comprobación
    // solo tiene sentido cuando la respuesta viene directo de internet (aplicación de escritorio).
    const destino = res.url ? new URL(res.url).hostname : "";
    if (destino && destino !== "127.0.0.1" && destino !== "localhost" && !esHostYouTube(destino)) {
      throw new ErrorApi(traducir("YouTube redirigió a un sitio externo."), undefined, "REDIRECT");
    }
    return { status: res.status, text: await res.text() };
  } catch (err) {
    if (err instanceof ErrorApi) throw err;
    const timeout = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ErrorApi(
      timeout ? traducir("YouTube tardó demasiado en responder.") : traducir("No se pudo contactar con YouTube."),
      traducir("Comprueba tu conexión a internet e inténtalo de nuevo en unos segundos."),
      timeout ? "TIMEOUT" : "NETWORK",
    );
  }
}
