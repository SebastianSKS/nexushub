"use client";

import { Card } from "@/components/fluent/Card";
import type { ToolId } from "@/types/documents";
import { CompressOptionsPanel } from "./CompressOptionsPanel";
import { ImagesOptionsPanel } from "./ImagesOptionsPanel";
import { PdfToImagesOptionsPanel } from "./PdfToImagesOptionsPanel";
import { PdfToWordOptionsPanel } from "./PdfToWordOptionsPanel";
import { ProtectOptionsPanel } from "./ProtectOptionsPanel";
import { RotateOptionsPanel } from "./RotateOptionsPanel";
import { SplitOptionsPanel } from "./SplitOptionsPanel";
import { UnlockOptionsPanel } from "./UnlockOptionsPanel";

/** Panel de opciones de la herramienta activa; las conversiones simples no tienen opciones. */
export function OptionsPanel({ toolId }: { toolId: ToolId }) {
  let body: React.ReactNode = null;
  switch (toolId) {
    case "compress":
      body = <CompressOptionsPanel />;
      break;
    case "images-to-pdf":
      body = <ImagesOptionsPanel />;
      break;
    case "pdf-to-images":
      body = <PdfToImagesOptionsPanel />;
      break;
    case "pdf-to-word":
      body = <PdfToWordOptionsPanel />;
      break;
    case "split":
      body = <SplitOptionsPanel />;
      break;
    case "rotate":
      body = <RotateOptionsPanel />;
      break;
    case "protect-pdf":
      body = <ProtectOptionsPanel />;
      break;
    case "unlock-pdf":
      body = <UnlockOptionsPanel />;
      break;
    default:
      return null;
  }
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-body font-semibold text-fg">Opciones</h3>
      {body}
    </Card>
  );
}
