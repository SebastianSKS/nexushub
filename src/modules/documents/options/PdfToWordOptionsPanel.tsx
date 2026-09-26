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
  const [hayWord, setHayWord] = useState(false);
  useEffect(() => {
    if (escritorio) void officeDisponible().then((d) => setHayWord(d.word));
  }, [escritorio]);
  const conWord = escritorio === true && usarOffice && hayWord;
  return (
    <RadioCards
      label={t("Resultado")}
      value={o.mode}
      options={[
        { value: "editable", title: t("Texto editable"), description: t("Texto, títulos e imágenes que puedes modificar. No reconstruye tablas ni gráficos dibujados.") },
        { value: "fiel", title: t("Fiel al diseño"), description: t("Cada página como imagen, idéntica al PDF. Se ve igual, pero el texto no se edita.") },
        ...(conWord ? [{ value: "word" as const, title: t("Con Word"), description: t("Lo convierte tu Microsoft Word: conserva mejor tablas y fuentes. Puede tardar más.") }] : []),
      ]}
      onChange={(mode) => setOption("pdfToWord", { mode })}
    />
  );
}
