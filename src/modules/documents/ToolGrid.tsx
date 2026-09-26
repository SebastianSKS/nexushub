"use client";

import { useT } from "@/lib/i18n";
import { TOOLS } from "@/lib/documents/tools";
import { useDocumentsStore } from "@/store/documents-store";
import { ToolCard } from "./ToolCard";

/** Cuadrícula con todas las herramientas. Con archivos en cola, resalta las que los admiten. */
export function ToolGrid() {
  const t = useT();
  const files = useDocumentsStore((s) => s.files);
  const hasFiles = files.length > 0;

  return (
    <section aria-labelledby="tools-heading">
      <h2 id="tools-heading" className="mb-3 text-subtitle text-fg">
        {hasFiles ? (files.length === 1 ? t("Elige qué hacer con tu archivo") : t("Elige qué hacer con tus {n} archivos", { n: files.length })) : t("Herramientas")}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
        {TOOLS.map((tool) => {
          // Con una cola mezclada, la herramienta sirve si admite al menos uno de los archivos.
          const compatible = !hasFiles || files.some((f) => f.kind && tool.accepts.includes(f.kind));
          return (
            <ToolCard
              key={tool.id}
              tool={tool}
              compatible={compatible}
              suggested={hasFiles && compatible}
            />
          );
        })}
      </div>
    </section>
  );
}
