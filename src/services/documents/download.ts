import JSZip from "jszip";
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
