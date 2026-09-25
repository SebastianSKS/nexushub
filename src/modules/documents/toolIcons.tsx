import type { ReactNode } from "react";
import {
  ArrowMinimizeVertical24Regular,
  ArrowRotateClockwise24Regular,
  ArrowSplit24Regular,
  ArrowSwap24Regular,
  DocumentAdd24Regular,
  DocumentArrowRight24Regular,
  DocumentPdf24Regular,
  DocumentText24Regular,
  FolderZip24Regular,
  Image24Regular,
  ImageMultiple24Regular,
  LockClosed24Regular,
  LockOpen24Regular,
  SlideText24Regular,
  Table24Regular,
  TextNumberFormat24Regular,
  TextGrammarWand24Regular,
  DrawText24Regular,
  ArrowSort24Regular,
} from "@fluentui/react-icons";
import { LogoPrograma } from "@/components/fluent/LogoPrograma";
import type { InputKind, ToolId } from "@/types/documents";

/** Los logos originales de Word, Excel y PowerPoint (los del programa instalado) para lo que tiene que ver con ellos. */
const word = <LogoPrograma programa="word" tam={24} />;
const excel = <LogoPrograma programa="excel" tam={24} />;
const powerpoint = <LogoPrograma programa="powerpoint" tam={24} />;

export const TOOL_ICONS: Record<ToolId, ReactNode> = {
  "word-to-pdf": word,
  "pdf-to-word": word,
  "excel-to-pdf": excel,
  "powerpoint-to-pdf": powerpoint,
  merge: <DocumentAdd24Regular />,
  split: <ArrowSplit24Regular />,
  compress: <ArrowMinimizeVertical24Regular />,
  "images-to-pdf": <Image24Regular />,
  "pdf-to-images": <ImageMultiple24Regular />,
  rotate: <ArrowRotateClockwise24Regular />,
  "protect-pdf": <LockClosed24Regular />,
  "unlock-pdf": <LockOpen24Regular />,
  "compare-pdf": <ArrowSwap24Regular />,
  organize: <ArrowSort24Regular />,
  watermark: <DrawText24Regular />,
  "page-numbers": <TextNumberFormat24Regular />,
  ocr: <TextGrammarWand24Regular />,
};

export const KIND_ICONS: Record<InputKind, ReactNode> = {
  word,
  excel,
  powerpoint,
  pdf: <DocumentPdf24Regular />,
  image: <Image24Regular />,
};

export function iconForMime(mime: string): ReactNode {
  if (mime === "application/zip") return <FolderZip24Regular />;
  if (mime.includes("wordprocessingml")) return word;
  if (mime.includes("spreadsheetml")) return excel;
  if (mime.includes("presentationml")) return powerpoint;
  if (mime === "text/plain") return <LogoPrograma programa="texto" tam={24} />;
  return <DocumentPdf24Regular />;
}
