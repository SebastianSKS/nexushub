"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useDocumentsStore } from "@/store/documents-store";

export function OcrOptionsPanel() {
  const o = useDocumentsStore((s) => s.options.ocr);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label="Resultado"
        value={o.output}
        options={[
          { value: "pdf", label: "PDF con texto" },
          { value: "text", label: "Solo texto" },
        ]}
        onChange={(output) => setOption("ocr", { output })}
      />
      <p className="text-caption text-fg-tertiary">
        {o.output === "pdf"
          ? "Un PDF igual al original, pero en el que puedes buscar, seleccionar y copiar el texto. Las páginas quedan como imagen."
          : "Un archivo .txt con el texto reconocido, listo para pegar en Word o en tus apuntes."}
      </p>
      <p className="text-caption text-fg-tertiary">Funciona sin internet y en tu equipo. Leer cada página tarda unos segundos; la primera vez, un poco más.</p>
    </div>
  );
}
