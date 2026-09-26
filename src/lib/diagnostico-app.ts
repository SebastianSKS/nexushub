import { armarDiagnostico, direccionDeReporte } from "@/lib/diagnostico";
import { abrirExterno, esEscritorio } from "@/lib/entorno";
import { useIdiomaStore } from "@/lib/i18n";

/** El repositorio donde se abren los reportes. */
export const REPOSITORIO = "SebastianSKS/nexushub";

async function versionDeLaApp(): Promise<string> {
  if (!esEscritorio()) return "web";
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return "";
  }
}

/** El diagnóstico de este momento (versión, sistema, idioma, pantalla y, si lo hay, el error), listo para copiar. */
export async function diagnosticoDeAhora(error?: (Error & { digest?: string }) | null): Promise<string> {
  return armarDiagnostico({
    version: await versionDeLaApp(),
    entorno: esEscritorio() ? "escritorio" : "web",
    idioma: useIdiomaStore.getState().idioma,
    ruta: typeof location === "undefined" ? undefined : location.pathname,
    agente: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    error: error ? { nombre: error.name, mensaje: error.message, pila: error.stack, digest: error.digest } : undefined,
  });
}

/** Copia texto al portapapeles. Devuelve false si el sistema no lo dejó. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** Abre un reporte nuevo en GitHub (en el navegador) con el diagnóstico ya puesto. */
export const abrirReporte = (diagnostico: string): Promise<void> => abrirExterno(direccionDeReporte(REPOSITORIO, diagnostico));
