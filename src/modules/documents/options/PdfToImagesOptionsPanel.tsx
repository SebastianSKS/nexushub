"use client";

import { useT } from "@/lib/i18n";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

export function PdfToImagesOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.pdfToImages);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <div>
      <SegmentedControl
        label={t("Resolución")}
        value={o.dpi}
        options={[
          { value: 100, label: t("Borrador") },
          { value: 150, label: t("Estándar") },
          { value: 200, label: t("Alta") },
        ]}
        onChange={(dpi) => setOption("pdfToImages", { dpi })}
      />
      <p className="mt-1.5 text-caption text-fg-tertiary">{o.dpi} dpi. {t("Más resolución da imágenes más nítidas y pesadas.")}</p>
    </div>
  );
}
