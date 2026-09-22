"use client";

import { RadioCards } from "@/components/fluent/RadioCards";
import { useDocumentsStore } from "@/store/documents-store";
import type { CompressLevel } from "@/types/documents";

const LEVELS = [
  { value: "light", title: "Ligera", description: "Mejor calidad: imágenes a 300 dpi. Reduce poco." },
  { value: "recommended", title: "Recomendada", description: "Equilibrio: imágenes a 150 dpi. Lo habitual." },
  { value: "extreme", title: "Extrema", description: "Menor peso: imágenes a 72 dpi. Pierde nitidez." },
] as const satisfies readonly { value: CompressLevel; title: string; description: string }[];

export function CompressOptionsPanel() {
  const options = useDocumentsStore((s) => s.options.compress);
  const setOption = useDocumentsStore((s) => s.setOption);
  return (
    <RadioCards
      label="Nivel de compresión"
      value={options.level}
      options={LEVELS}
      onChange={(level) => setOption("compress", { level })}
    />
  );
}
