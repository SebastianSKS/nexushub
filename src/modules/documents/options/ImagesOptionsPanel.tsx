"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

export function ImagesOptionsPanel() {
  const o = useDocumentsStore((s) => s.options.imagesToPdf);
  const setOption = useDocumentsStore((s) => s.setOption);
  const fit = o.pageSize === "fit";

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Tamaño de página"
        value={o.pageSize}
        options={[
          { value: "a4", label: "A4" },
          { value: "letter", label: "Carta" },
          { value: "fit", label: "Ajustar" },
        ]}
        onChange={(pageSize) => setOption("imagesToPdf", { ...o, pageSize })}
      />
      <div>
        <SegmentedControl
          label="Orientación"
          value={o.orientation}
          disabled={fit}
          options={[
            { value: "auto", label: "Automática" },
            { value: "portrait", label: "Vertical" },
            { value: "landscape", label: "Horizontal" },
          ]}
          onChange={(orientation) => setOption("imagesToPdf", { ...o, orientation })}
        />
        {fit && (
          <p className="mt-1.5 text-caption text-fg-tertiary">
            Con «Ajustar», cada página toma la forma de su imagen.
          </p>
        )}
      </div>
      <SegmentedControl
        label="Margen"
        value={o.margin}
        options={[
          { value: "none", label: "Sin margen" },
          { value: "small", label: "Pequeño" },
          { value: "large", label: "Grande" },
        ]}
        onChange={(margin) => setOption("imagesToPdf", { ...o, margin })}
      />
    </div>
  );
}
