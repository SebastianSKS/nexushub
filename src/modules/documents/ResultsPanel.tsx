"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownload20Regular, CheckmarkCircle16Filled, CheckmarkCircle20Filled, ErrorCircle16Filled } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { formatBytes } from "@/lib/documents/format";
import { descargar, mostrarDescarga, zipResults, type Descargado } from "@/services/documents/download";
import { useDocumentsStore } from "@/store/documents-store";
import { iconForMime } from "./toolIcons";

/** Resultado: nombre, peso, ahorro (en compresión) y botón de descarga por archivo. */
export function ResultsPanel() {
  const results = useDocumentsStore((s) => s.results);
  const warnings = useDocumentsStore((s) => s.warnings);
  const clearFiles = useDocumentsStore((s) => s.clearFiles);
  const [zipping, setZipping] = useState(false);
  // Qué se descargó ya y dónde quedó (o por qué falló): sin esto, el clic en «Descargar» no parece hacer nada.
  const [hechos, setHechos] = useState<Record<string, Descargado | { error: string }>>({});
  const guardar = async (clave: string, blob: Blob, nombre: string) => {
    try {
      const d = await descargar(blob, nombre);
      if (d.cancelado) return; // cerró «Guardar como» sin guardar: no hay nada que avisar
      setHechos((h) => ({ ...h, [clave]: d }));
    } catch (e) {
      setHechos((h) => ({ ...h, [clave]: { error: e instanceof Error ? e.message : "No se pudo guardar el archivo." } }));
    }
  };
  const ref = useRef<HTMLDivElement>(null);

  // Al terminar, el resultado se trae a la vista aunque el layout sea de una columna.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const downloadAll = async () => {
    setZipping(true);
    try {
      await guardar("zip", await zipResults(results), "nexushub-resultados.zip");
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
          <li key={r.id} className="rounded-control flex flex-col gap-2 border border-stroke bg-layer px-3 py-2">
            <div className="flex items-center gap-3">
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
              variant={hechos[r.id] && !("error" in hechos[r.id]!) ? "standard" : results.length === 1 ? "accent" : "standard"}
              icon={<ArrowDownload20Regular />}
              onClick={() => void guardar(r.id, r.blob, r.name)}
              aria-label={`Descargar ${r.name}`}
              className="h-8 shrink-0"
            >
              Descargar
            </Button>
            </div>
            <Confirmacion estado={hechos[r.id]} />
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
        {results.length > 1 && hechos.zip && <Confirmacion estado={hechos.zip} />}
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

/** «✓ Guardado en Descargas como …» con acceso a la carpeta; o el motivo si no se pudo. */
function Confirmacion({ estado }: { estado: Descargado | { error: string } | undefined }) {
  if (!estado) return null;
  if ("error" in estado) {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-caption text-danger-fg">
        <ErrorCircle16Filled className="mt-0.5 shrink-0" aria-hidden />
        {estado.error}
      </p>
    );
  }
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-success-fg">
      <span className="flex items-center gap-1.5 font-semibold">
        <CheckmarkCircle16Filled className="shrink-0" aria-hidden />
        {estado.ruta ? `Guardado en «${carpetaDe(estado.ruta)}» como «${estado.nombre}»` : "Descarga iniciada: búscala en las descargas de tu navegador"}
      </span>
      {estado.ruta && (
        <button type="button" onClick={() => void mostrarDescarga(estado.ruta!).catch(() => {})} className="text-accent-text underline hover:no-underline">
          Mostrar en la carpeta
        </button>
      )}
    </p>
  );
}

/** Nombre de la carpeta donde quedó un archivo («Descargas», «Redes»…). */
function carpetaDe(ruta: string): string {
  const partes = ruta.split(/[\\/]/);
  const carpeta = partes[partes.length - 2] ?? "";
  return carpeta === "Downloads" ? "Descargas" : carpeta;
}
