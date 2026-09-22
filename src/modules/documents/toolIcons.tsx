import type { ReactNode } from "react";
import {
  ArrowMinimizeVertical24Regular,
  ArrowRotateClockwise24Regular,
  ArrowSplit24Regular,
  DocumentAdd24Regular,
  DocumentArrowRight24Regular,
  DocumentPdf24Regular,
  DocumentText24Regular,
  FolderZip24Regular,
  Image24Regular,
  ImageMultiple24Regular,
  SlideText24Regular,
  Table24Regular,
} from "@fluentui/react-icons";
import type { InputKind, ToolId } from "@/types/documents";

export const TOOL_ICONS: Record<ToolId, ReactNode> = {
  "word-to-pdf": <DocumentText24Regular />,
  "pdf-to-word": <DocumentArrowRight24Regular />,
  "excel-to-pdf": <Table24Regular />,
  "powerpoint-to-pdf": <SlideText24Regular />,
  merge: <DocumentAdd24Regular />,
  split: <ArrowSplit24Regular />,
  compress: <ArrowMinimizeVertical24Regular />,
  "images-to-pdf": <Image24Regular />,
  "pdf-to-images": <ImageMultiple24Regular />,
  rotate: <ArrowRotateClockwise24Regular />,
};

export const KIND_ICONS: Record<InputKind, ReactNode> = {
  word: <DocumentText24Regular />,
  excel: <Table24Regular />,
  powerpoint: <SlideText24Regular />,
  pdf: <DocumentPdf24Regular />,
  image: <Image24Regular />,
};

export function iconForMime(mime: string): ReactNode {
  if (mime === "application/zip") return <FolderZip24Regular />;
  if (mime.includes("wordprocessingml")) return <DocumentText24Regular />;
  return <DocumentPdf24Regular />;
}
