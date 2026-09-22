"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownload20Regular, CheckmarkCircle20Filled } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { formatBytes } from "@/lib/documents/format";
import { saveBlob, zipResults } from "@/services/documents/download";
import { useDocumentsStore } from "@/store/documents-store";
import { iconForMime } from "./toolIcons";

/** Resultado: nombre, peso, ahorro (en compresión) y botón de descarga por archivo. */
export function ResultsPanel() {
  const results = useDocumentsStore((s) => s.results);
  const warnings = useDocumentsStore((s) => s.warnings);
  const clearFiles = useDocumentsStore((s) => s.clearFiles);
  const [zipping, setZipping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Al terminar, el resultado se trae a la vista aunque el layout sea de una columna.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const downloadAll = async () => {
    setZipping(true);
    try {
      saveBlob(await zipResults(results), "nexushub-resultados.zip");
    } finally {
      setZipping(false);
    }
  };

  return (
    <Card className="p-4" ref={ref}>
      <div className="mb-3 flex items-center gap-2">
        <CheckmarkCircle20Filled className="text-success-fg" aria-hidden />
        <h3 className="text-body font-semibold text-fg">
          {results.length === 1 ? "Tu archivo está listo" : `Tus ${results.length} archivos están listos`}
        </h3>
      </div>

      <ul className="flex flex-col gap-2">
        {results.map((r) => (
          <li key={r.id} className="rounded-control flex items-center gap-3 border border-stroke bg-layer px-3 py-2">
            <span className="flex shrink-0 text-accent-text" aria-hidden>
              {iconForMime(r.mime)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body text-fg" title={r.name}>
                {r.name}
              </p>
              <p className="tabular text-caption text-fg-secondary">
                {r.originalSize !== undefined ? (
                  <>
                    {formatBytes(r.originalSize)} → {formatBytes(r.size)}
                    {" · "}
                    <span className={r.savedPercent ? "font-semibold text-success-fg" : ""}>
                      {r.savedPercent ? `${r.savedPercent}% menos` : "sin reducción posible"}
                    </span>
                  </>
                ) : (
                  formatBytes(r.size)
                )}
              </p>
            </div>
            <Button
              variant={results.length === 1 ? "accent" : "standard"}
              icon={<ArrowDownload20Regular />}
              onClick={() => saveBlob(r.blob, r.name)}
              aria-label={`Descargar ${r.name}`}
              className="h-8 shrink-0"
            >
              Descargar
            </Button>
          </li>
        ))}
      </ul>

      {warnings.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {warnings.map((w) => (
            <InfoBar key={w} severity="warning" title={w} />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {results.length > 1 && (
          <Button onClick={downloadAll} disabled={zipping} icon={<ArrowDownload20Regular />} className="w-full">
            {zipping ? "Preparando el ZIP…" : "Descargar todo (ZIP)"}
          </Button>
        )}
        <Button variant="subtle" onClick={clearFiles} className="w-full">
          Procesar otros archivos
        </Button>
      </div>
    </Card>
  );
}
