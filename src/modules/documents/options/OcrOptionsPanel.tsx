"use client";

import { useT } from "@/lib/i18n";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

export function OcrOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.ocr);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label={t("Resultado")}
        value={o.output}
        options={[
          { value: "pdf", label: t("PDF con texto") },
          { value: "text", label: t("Solo texto") },
        ]}
        onChange={(output) => setOption("ocr", { output })}
      />
      <p className="text-caption text-fg-tertiary">
        {o.output === "pdf"
          ? t("Un PDF igual al original, pero en el que puedes buscar, seleccionar y copiar el texto. Las páginas quedan como imagen.")
          : t("Un archivo .txt con el texto reconocido, listo para pegar en Word o en tus apuntes.")}
      </p>
      <p className="text-caption text-fg-tertiary">{t("Funciona sin internet y en tu equipo. Leer cada página tarda unos segundos; la primera vez, un poco más.")}</p>
    </div>
  );
}
