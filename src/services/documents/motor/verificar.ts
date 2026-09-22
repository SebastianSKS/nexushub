import { fileTypeFromBlob } from "file-type";
import { extensionOf } from "@/lib/documents/format";
import type { InputKind } from "@/types/documents";
import { DocumentError } from "../errors";

const MIME_A_TIPO: Record<string, InputKind> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "powerpoint",
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
};

const ETIQUETA: Record<InputKind, string> = {
  word: "documento de Word",
  excel: "libro de Excel",
  powerpoint: "presentación de PowerPoint",
  pdf: "PDF",
  image: "imagen JPG o PNG",
};

/**
 * Comprueba por el CONTENIDO del archivo (su firma binaria), no por su extensión, que es lo que dice ser.
 * Así un .pdf que en realidad es otra cosa se rechaza con un mensaje claro en vez de fallar a la mitad.
 */
export async function verificarContenido(file: File, esperado: InputKind): Promise<void> {
  const detectado = await fileTypeFromBlob(file).catch(() => undefined);
  let tipo: InputKind | undefined = detectado ? MIME_A_TIPO[detectado.mime] : undefined;
  // .doc antiguo: contenedor binario CFB (que también usan .xls y .ppt); solo se acepta si se declaró como .doc.
  if (!tipo && detectado?.mime === "application/x-cfb" && extensionOf(file.name) === ".doc") tipo = "word";
  if (tipo !== esperado) {
    throw new DocumentError(
      `«${file.name}» no es realmente un ${ETIQUETA[esperado]}.`,
      "Su contenido no coincide con su extensión. Ábrelo en su programa y guárdalo de nuevo con el formato correcto.",
      "BAD_CONTENT",
    );
  }
}
