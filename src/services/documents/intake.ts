import { formatBytes } from "@/lib/documents/format";
import { kindFromFilename } from "@/lib/documents/kinds";
import { MAX_FILE_BYTES, MAX_FILES_PER_BATCH } from "@/lib/documents/limits";
import type { Notice, QueuedFile } from "@/types/documents";

export interface IntakeResult {
  accepted: QueuedFile[];
  rejected: Omit<Notice, "id">[];
}

/**
 * Filtra los archivos que entran a la cola: tamaño, cantidad y familia por
 * extensión. La verificación del contenido real la hace el servidor al subir.
 */
export function intakeFiles(incoming: File[], current: QueuedFile[]): IntakeResult {
  const accepted: QueuedFile[] = [];
  const rejected: IntakeResult["rejected"] = [];

  for (const file of incoming) {
    const kind = kindFromFilename(file.name);
    if (!kind) {
      rejected.push({
        severity: "warning",
        title: `«${file.name}» no es un formato compatible.`,
        message: "Admitidos: DOCX, XLSX, PPTX, PDF, JPG y PNG. Si tu archivo es un .doc, .xls o .ppt antiguo, guárdalo primero en el formato nuevo.",
      });
      continue;
    }
    if (file.size === 0) {
      rejected.push({ severity: "warning", title: `«${file.name}» está vacío.`, message: "Elige un archivo con contenido." });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({
        severity: "error",
        title: `«${file.name}» pesa ${formatBytes(file.size)}.`,
        message: `El límite es ${formatBytes(MAX_FILE_BYTES)} por archivo. Comprímelo o divídelo primero.`,
      });
      continue;
    }
    if (current.length + accepted.length >= MAX_FILES_PER_BATCH) {
      rejected.push({
        severity: "warning",
        title: `«${file.name}» no se añadió.`,
        message: `El límite es ${MAX_FILES_PER_BATCH} archivos por lote.`,
      });
      continue;
    }
    accepted.push({ id: crypto.randomUUID(), file, kind });
  }
  return { accepted, rejected };
}
