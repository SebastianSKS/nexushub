"use client";

import { T, useT } from "@/lib/i18n";
import { RadioCards } from "@/components/fluent/RadioCards";
import { useDocumentsStore } from "@/store/documents-store";
import type { CompressLevel } from "@/types/documents";

const LEVELS = [
  { value: "light", title: T("Ligera"), description: T("Mejor calidad: imágenes a 300 dpi. Reduce poco.") },
  { value: "recommended", title: T("Recomendada"), description: T("Equilibrio: imágenes a 150 dpi. Lo habitual.") },
  { value: "extreme", title: T("Extrema"), description: T("Menor peso: imágenes a 72 dpi. Pierde nitidez.") },
] as const satisfies readonly { value: CompressLevel; title: string; description: string }[];

export function CompressOptionsPanel() {
  const t = useT();
  const options = useDocumentsStore((s) => s.options.compress);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <RadioCards
      label={t("Nivel de compresión")}
      value={options.level}
      options={LEVELS.map((l) => ({ ...l, title: t(l.title), description: t(l.description) }))}
      onChange={(level) => setOption("compress", { level })}
    />
  );
}
