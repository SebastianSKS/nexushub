"use client";

import { useT } from "@/lib/i18n";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

export function ImagesOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.imagesToPdf);
  const setOption = useDocumentsStore((s) => s.setOption);
  const fit = o.pageSize === "fit";

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label={t("Tamaño de página")}
        value={o.pageSize}
        options={[
          { value: "a4", label: "A4" },
          { value: "letter", label: t("Carta") },
          { value: "fit", label: t("Ajustar") },
        ]}
        onChange={(pageSize) => setOption("imagesToPdf", { ...o, pageSize })}
      />
      <div>
        <SegmentedControl
          label={t("Orientación")}
          value={o.orientation}
          disabled={fit}
          options={[
            { value: "auto", label: t("Automática") },
            { value: "portrait", label: t("Vertical") },
            { value: "landscape", label: t("Horizontal") },
          ]}
          onChange={(orientation) => setOption("imagesToPdf", { ...o, orientation })}
        />
        {fit && (
          <p className="mt-1.5 text-caption text-fg-tertiary">
            {t("Con «Ajustar», cada página toma la forma de su imagen.")}
          </p>
        )}
      </div>
      <SegmentedControl
        label={t("Margen")}
        value={o.margin}
        options={[
          { value: "none", label: t("Sin margen") },
          { value: "small", label: t("Pequeño") },
          { value: "large", label: t("Grande") },
        ]}
        onChange={(margin) => setOption("imagesToPdf", { ...o, margin })}
      />
    </div>
  );
}
