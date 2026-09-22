"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

const AYUDA = {
  editable: "El texto queda como texto editable y las imágenes del PDF se colocan en su sitio. Los gráficos dibujados (infografías, diagramas) no se pueden extraer: para esos PDF usa «Fiel al diseño».",
  fiel: "Cada página se inserta como una imagen, idéntica al PDF original. Se ve exactamente igual, pero el texto no se puede editar en Word.",
} as const;

export function PdfToWordOptionsPanel() {
  const o = useDocumentsStore((s) => s.options.pdfToWord);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <div>
      <SegmentedControl
        label="Resultado"
        value={o.mode}
        options={[
          { value: "editable", label: "Texto editable" },
          { value: "fiel", label: "Fiel al diseño" },
        ]}
        onChange={(mode) => setOption("pdfToWord", { mode })}
      />
      <p className="mt-1.5 text-caption text-fg-tertiary">{AYUDA[o.mode]}</p>
    </div>
  );
}
