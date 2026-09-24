import JSZip from "jszip";
import { esEscritorio } from "@/lib/entorno";
import type { ResultItem } from "@/types/documents";

/** Guarda un Blob con el diálogo de descarga del navegador. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera tras un momento: algunos navegadores necesitan el URL vivo mientras inician la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Empaqueta varios resultados en un único ZIP (nombres repetidos se numeran). */
export async function zipResults(results: ResultItem[]): Promise<Blob> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const r of results) {
    let name = r.name;
    for (let n = 2; used.has(name); n++) {
      const dot = r.name.lastIndexOf(".");
      name = dot > 0 ? `${r.name.slice(0, dot)} (${n})${r.name.slice(dot)}` : `${r.name} (${n})`;
    }
    used.add(name);
    zip.file(name, r.blob, { compression: "STORE" });
  }
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

export interface Descargado {
  /** Ruta completa del archivo guardado (solo en la aplicación de escritorio, donde se guarda en Descargas). */
  ruta?: string;
  /** Nombre con el que quedó (puede llevar «(2)» si ya había uno igual). */
  nombre: string;
}

/**
 * Descarga un resultado y dice dónde quedó. En la aplicación de escritorio lo guarda directamente en la carpeta
 * Descargas (y se puede mostrar en el Explorador); en el navegador usa la descarga normal.
 */
export async function descargar(blob: Blob, name: string): Promise<Descargado> {
  if (esEscritorio()) {
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      const ruta = await invoke<string>("descarga_guardar", new Uint8Array(await blob.arrayBuffer()), { headers: { "x-nombre": encodeURIComponent(name) } });
      return { ruta, nombre: ruta.split(/[\\/]/).pop() ?? name };
    } catch (e) {
      throw new Error(typeof e === "string" ? e : "No se pudo guardar el archivo.");
    }
  }
  saveBlob(blob, name);
  return { nombre: name };
}

/** Muestra en el Explorador un archivo guardado con `descargar`. */
export async function mostrarDescarga(ruta: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("descarga_mostrar", { ruta });
}
