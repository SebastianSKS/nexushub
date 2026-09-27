import { armarDiagnostico, direccionDeReporte } from "@/lib/diagnostico";
import { abrirExterno, esEscritorio } from "@/lib/entorno";
import { useIdiomaStore } from "@/lib/i18n";
import { ahorroActivo, pistasDelEquipo } from "@/lib/rendimiento";
import { useAjustesStore } from "@/store/ajustes-store";

/** El repositorio donde se abren los reportes. */
export const REPOSITORIO = "SebastianSKS/nexushub";

/** «4 núcleos, 8 GB, bajo consumo: sí»: lo que el navegador sabe del equipo y si el modo de bajo consumo está en marcha. */
function descripcionDelEquipo(): string {
  const p = pistasDelEquipo();
  const partes = [p.nucleos ? `${p.nucleos} núcleos` : "", p.memoriaGB ? `${p.memoriaGB} GB` : ""].filter(Boolean);
  const modo = useAjustesStore.getState().modoAhorro;
  partes.push(`bajo consumo: ${ahorroActivo(modo, p) ? "sí" : "no"} (${modo})`);
  return partes.join(", ");
}

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
    equipo: descripcionDelEquipo(),
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
