import type { InputKind, QueuedFile, ToolId } from "@/types/documents";

/** Con qué herramienta se vuelve PDF cada tipo de archivo (un PDF ya lo es). */
const A_PDF: Partial<Record<InputKind, ToolId>> = {
  word: "word-to-pdf",
  excel: "excel-to-pdf",
  powerpoint: "powerpoint-to-pdf",
  image: "images-to-pdf",
};

/**
 * Para «Iniciar cola»: un trabajo por cada tipo de archivo que se pueda convertir, en el orden en que aparecen.
 * Las imágenes van juntas en un solo PDF, como en «Imágenes a PDF».
 */
export function planAPdf(files: QueuedFile[]): { toolId: ToolId; files: QueuedFile[] }[] {
  const grupos = new Map<ToolId, QueuedFile[]>();
  for (const f of files) {
    const herramienta = f.kind ? A_PDF[f.kind] : undefined;
    if (herramienta) grupos.set(herramienta, [...(grupos.get(herramienta) ?? []), f]);
  }
  return [...grupos].map(([toolId, suyos]) => ({ toolId, files: suyos }));
}
