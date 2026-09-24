"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { officeDisponible } from "@/services/documents/motor/office";
import { useAjustesStore } from "@/store/ajustes-store";
import { useDocumentsStore } from "@/store/documents-store";

const AYUDA = {
  editable: "El texto queda como texto editable y las imágenes del PDF se colocan en su sitio. Los gráficos dibujados (infografías, diagramas) no se pueden extraer: para esos PDF usa «Fiel al diseño».",
  word: "Lo convierte Microsoft Word instalado en tu computadora: conserva mejor el formato (tablas, columnas, fuentes). Puede tardar más, sobre todo la primera vez.",
  fiel: "Cada página se inserta como una imagen, idéntica al PDF original. Se ve exactamente igual, pero el texto no se puede editar en Word.",
} as const;

export function PdfToWordOptionsPanel() {
  const o = useDocumentsStore((s) => s.options.pdfToWord);
  const setOption = useDocumentsStore((s) => s.setOption);
  const escritorio = useEsEscritorio();
  const usarOffice = useAjustesStore((s) => s.usarOffice);
  const [hayWord, setHayWord] = useState(false);
  useEffect(() => {
    if (escritorio) void officeDisponible().then((d) => setHayWord(d.word));
  }, [escritorio]);
  const conWord = escritorio === true && usarOffice && hayWord;
  return (
    <div>
      <SegmentedControl
        label="Resultado"
        value={o.mode}
        options={[
          { value: "editable", label: "Texto editable" },
          { value: "fiel", label: "Fiel al diseño" },
          ...(conWord ? [{ value: "word" as const, label: "Con Word" }] : []),
        ]}
        onChange={(mode) => setOption("pdfToWord", { mode })}
      />
      <p className="mt-1.5 text-caption text-fg-tertiary">{AYUDA[o.mode]}</p>
    </div>
  );
}
