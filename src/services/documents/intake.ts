import { formatBytes } from "@/lib/documents/format";
import { traducir } from "@/lib/i18n";
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
        title: traducir("«{name}» no es un formato compatible.", { name: file.name }),
        message: traducir("Admitidos: DOCX, XLSX, PPTX, PDF, JPG y PNG. Si tu archivo es un .doc, .xls o .ppt antiguo, guárdalo primero en el formato nuevo."),
      });
      continue;
    }
    if (file.size === 0) {
      rejected.push({ severity: "warning", title: traducir("«{name}» está vacío.", { name: file.name }), message: traducir("Elige un archivo con contenido.") });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({
        severity: "error",
        title: traducir("«{name}» pesa {size}.", { name: file.name, size: formatBytes(file.size) }),
        message: traducir("El límite es {max} por archivo. Comprímelo o divídelo primero.", { max: formatBytes(MAX_FILE_BYTES) }),
      });
      continue;
    }
    if (current.length + accepted.length >= MAX_FILES_PER_BATCH) {
      rejected.push({
        severity: "warning",
        title: traducir("«{name}» no se añadió.", { name: file.name }),
        message: traducir("El límite es {max} archivos por lote.", { max: MAX_FILES_PER_BATCH }),
      });
      continue;
    }
    accepted.push({ id: crypto.randomUUID(), file, kind });
  }
  return { accepted, rejected };
}
