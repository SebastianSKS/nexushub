export type ToolId =
  | "word-to-pdf"
  | "pdf-to-word"
  | "excel-to-pdf"
  | "powerpoint-to-pdf"
  | "merge"
  | "split"
  | "compress"
  | "images-to-pdf"
  | "pdf-to-images"
  | "rotate";

/** Familia de archivo (se confirma por el contenido real al procesar). */
export type InputKind = "word" | "excel" | "powerpoint" | "pdf" | "image";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  /** Texto del botón principal, p. ej. "Convertir a PDF". */
  action: string;
  accepts: readonly InputKind[];
  /** Mínimo de archivos para poder procesar. */
  minFiles: number;
  /** Máximo de archivos que admite la herramienta. */
  maxFiles: number;
  /** Etiqueta del resultado, p. ej. "PDF". */
  output: string;
}

// --- Opciones por herramienta ---------------------------------------------

export type CompressLevel = "light" | "recommended" | "extreme";
export interface CompressOptions {
  level: CompressLevel;
}

export type PageSizeOption = "a4" | "letter" | "fit";
export type OrientationOption = "auto" | "portrait" | "landscape";
export type MarginOption = "none" | "small" | "large";
export interface ImagesToPdfOptions {
  pageSize: PageSizeOption;
  orientation: OrientationOption;
  margin: MarginOption;
}

export interface SplitOptions {
  /** Rangos en texto: "1-3, 5, 7-9" (base 1). */
  ranges: string;
  /** single: un PDF con las páginas elegidas. separate: un PDF por rango. */
  mode: "single" | "separate";
}

export interface RotateOptions {
  /** Grados a sumar por página (base 1): 90, 180 o 270. */
  rotations: Record<string, 90 | 180 | 270>;
}

export interface PdfToWordOptions {
  /** editable: texto y párrafos editables, con las imágenes del PDF. fiel: cada página como imagen, idéntica al original. */
  mode: "editable" | "fiel";
}

export interface PdfToImagesOptions {
  dpi: 100 | 150 | 200;
}

export interface ToolOptionsMap {
  "word-to-pdf": Record<string, never>;
  "pdf-to-word": PdfToWordOptions;
  "excel-to-pdf": Record<string, never>;
  "powerpoint-to-pdf": Record<string, never>;
  merge: Record<string, never>;
  split: SplitOptions;
  compress: CompressOptions;
  "images-to-pdf": ImagesToPdfOptions;
  "pdf-to-images": PdfToImagesOptions;
  rotate: RotateOptions;
}

// --- Cliente ---------------------------------------------------------------

export interface QueuedFile {
  id: string;
  file: File;
  kind: InputKind | null;
}

export interface ResultItem {
  id: string;
  name: string;
  size: number;
  mime: string;
  blob: Blob;
  /** Solo compresión: peso original en bytes y porcentaje ahorrado. */
  originalSize?: number;
  savedPercent?: number;
}

export type NoticeSeverity = "info" | "success" | "warning" | "error";
export interface Notice {
  id: string;
  severity: NoticeSeverity;
  title: string;
  message?: string;
}
