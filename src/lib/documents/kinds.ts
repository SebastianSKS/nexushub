import type { InputKind } from "@/types/documents";
import { T } from "@/lib/i18n";
import { extensionOf } from "./format";

/** Extensiones que el usuario puede soltar, agrupadas por familia. */
const EXTENSION_KIND: Record<string, InputKind> = {
  ".docx": "word",
  ".doc": "word",
  ".xlsx": "excel",
  ".pptx": "powerpoint",
  ".pdf": "pdf",
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
};

/** Clasificación rápida por extensión (solo para la interfaz; el servidor verifica el contenido). */
export function kindFromFilename(filename: string): InputKind | null {
  return EXTENSION_KIND[extensionOf(filename)] ?? null;
}

export const KIND_LABEL: Record<InputKind, string> = {
  word: "Word",
  excel: "Excel",
  powerpoint: "PowerPoint",
  pdf: "PDF",
  image: T("Imagen"),
};

export const KIND_EXTENSIONS: Record<InputKind, string[]> = {
  word: [".docx", ".doc"],
  excel: [".xlsx"],
  powerpoint: [".pptx"],
  pdf: [".pdf"],
  image: [".jpg", ".jpeg", ".png"],
};
