"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

export function PdfToImagesOptionsPanel() {
  const o = useDocumentsStore((s) => s.options.pdfToImages);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <div>
      <SegmentedControl
        label="Resolución"
        value={o.dpi}
        options={[
          { value: 100, label: "Borrador" },
          { value: 150, label: "Estándar" },
          { value: 200, label: "Alta" },
        ]}
        onChange={(dpi) => setOption("pdfToImages", { dpi })}
      />
      <p className="mt-1.5 text-caption text-fg-tertiary">{o.dpi} dpi. Más resolución da imágenes más nítidas y pesadas.</p>
    </div>
  );
}
