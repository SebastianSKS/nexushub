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
  // Si ya sabemos si el programa de office puede pasar PDF a Word (o si no hace falta saberlo, fuera de escritorio).
  // Sin esto, el efecto de abajo vería "no se ofrece" durante el instante en que officeDisponible() todavía no
  // responde y borraría un «word» guardado aunque el programa sí esté disponible un momento después.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (escritorio === null) return;
    if (!escritorio) {
      setListo(true);
      return;
    }
    void officeDisponible().then((d) => {
      setConWord(d.pdfWord ? d.word.nombre : null);
      setListo(true);
    });
  }, [escritorio]);
  // Solo Microsoft Word sabe pasar un PDF a Word: LibreOffice abre el PDF como dibujo y sale inservible, así que en
  // Linux esta opción no se ofrece (el PDF a Word usa el motor básico de Nexo).
  const seOfrece = escritorio === true && usarOffice && !!conWord;
  // Puede quedar guardado el modo «word» de cuando sí se podía (otra máquina, o un respaldo restaurado). Como la
  // opción ya no está, se vuelve al de texto editable: si no, se intentaría un motor que aquí no existe.
  useEffect(() => {
    if (listo && !seOfrece && o.mode === "word") setOption("pdfToWord", { mode: "editable" });
  }, [listo, seOfrece, o.mode, setOption]);
  return (
    <RadioCards
      label={t("Resultado")}
      value={seOfrece ? o.mode : "editable"}
      options={[
        { value: "editable", title: t("Texto editable"), description: t("Texto, títulos e imágenes que puedes modificar. No reconstruye tablas ni gráficos dibujados.") },
        { value: "fiel", title: t("Fiel al diseño"), description: t("Cada página como imagen, idéntica al PDF. Se ve igual, pero el texto no se edita.") },
        ...(seOfrece ? [{ value: "word" as const, title: t("Con {programa}", { programa: conWord! }), description: t("Lo convierte {programa}: conserva mejor tablas y fuentes. Puede tardar más.", { programa: conWord! }) }] : []),
      ]}
      onChange={(mode) => setOption("pdfToWord", { mode })}
    />
  );
}
