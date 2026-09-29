"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { RadioCards } from "@/components/fluent/RadioCards";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { officeDisponible } from "@/services/documents/motor/office";
import { useAjustesStore } from "@/store/ajustes-store";
import { useDocumentsStore } from "@/store/documents-store";


export function PdfToWordOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.pdfToWord);
  const setOption = useDocumentsStore((s) => s.setOption);
  const escritorio = useEsEscritorio();
  const usarOffice = useAjustesStore((s) => s.usarOffice);
  const [conWord, setConWord] = useState<string | null>(null);
  useEffect(() => {
    if (escritorio) void officeDisponible().then((d) => setConWord(d.pdfWord ? d.word.nombre : null));
  }, [escritorio]);
  // Solo Microsoft Word sabe pasar un PDF a Word: LibreOffice abre el PDF como dibujo y sale inservible, así que en
  // Linux esta opción no se ofrece (el PDF a Word usa el motor básico de Nexo).
  const offered = escritorio === true && usarOffice && conWord;
  return (
    <RadioCards
      label={t("Resultado")}
      value={o.mode}
      options={[
        { value: "editable", title: t("Texto editable"), description: t("Texto, títulos e imágenes que puedes modificar. No reconstruye tablas ni gráficos dibujados.") },
        { value: "fiel", title: t("Fiel al diseño"), description: t("Cada página como imagen, idéntica al PDF. Se ve igual, pero el texto no se edita.") },
        ...(offered ? [{ value: "word" as const, title: t("Con {programa}", { programa: conWord }), description: t("Lo convierte {programa}: conserva mejor tablas y fuentes. Puede tardar más.", { programa: conWord }) }] : []),
      ]}
      onChange={(mode) => setOption("pdfToWord", { mode })}
    />
  );
}
