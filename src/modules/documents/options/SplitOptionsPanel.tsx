"use client";

import { useT } from "@/lib/i18n";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { TextInput } from "@/components/fluent/TextInput";
import { parseRanges, rangesToPages } from "@/lib/documents/ranges";
import { useDocumentsStore } from "@/store/documents-store";

export function SplitOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.split);
  const pageCount = useDocumentsStore((s) => s.pageCount);
  const setOption = useDocumentsStore((s) => s.setOption);

  const parsed = pageCount !== undefined && o.ranges.trim() ? parseRanges(o.ranges, pageCount) : null;
  const selectedCount = parsed && !parsed.error ? rangesToPages(parsed.ranges).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        label={t("Páginas o rangos")}
        value={o.ranges}
        placeholder={t("Ej. 1-3, 5, 7-9")}
        error={parsed?.error}
        hint={
          selectedCount > 0
            ? selectedCount === 1
              ? t("1 página seleccionada. También puedes elegirla en las miniaturas.")
              : t("{n} páginas seleccionadas. También puedes elegirlas en las miniaturas.", { n: selectedCount })
            : t("Escribe los rangos o haz clic en las miniaturas.")
        }
        onChange={(e) => setOption("split", { ...o, ranges: e.target.value })}
        autoComplete="off"
        spellCheck={false}
      />
      <SegmentedControl
        label={t("Resultado")}
        value={o.mode}
        options={[
          { value: "single", label: t("Un solo PDF") },
          { value: "separate", label: t("Uno por rango") },
        ]}
        onChange={(mode) => setOption("split", { ...o, mode })}
      />
      <p className="text-caption text-fg-tertiary">
        {o.mode === "single"
          ? t("Todas las páginas elegidas se juntan en un único PDF.")
          : t("Cada rango separado por coma genera su propio PDF.")}
      </p>
    </div>
  );
}
