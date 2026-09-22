"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/fluent/Button";
import { formatBytes } from "@/lib/documents/format";
import { pagesToRangeText, parseRanges, rangesToPages } from "@/lib/documents/ranges";
import { useDocumentsStore } from "@/store/documents-store";
import type { QueuedFile } from "@/types/documents";
import { PageThumbnails } from "./PageThumbnails";

/**
 * Selector de páginas de Dividir y Rotar. En Dividir la selección vive en el
 * texto de rangos (una sola fuente de verdad); en Rotar, en `selectedPages`.
 */
export function PagePicker({ file, mode }: { file: QueuedFile; mode: "split" | "rotate" }) {
  const split = useDocumentsStore((s) => s.options.split);
  const rotations = useDocumentsStore((s) => s.options.rotate.rotations);
  const selectedPages = useDocumentsStore((s) => s.selectedPages);
  const pageCount = useDocumentsStore((s) => s.pageCount);
  const setOption = useDocumentsStore((s) => s.setOption);
  const setSelectedPages = useDocumentsStore((s) => s.setSelectedPages);
  const setPageCount = useDocumentsStore((s) => s.setPageCount);
  const lastClicked = useRef<number | null>(null);

  const selected = useMemo<ReadonlySet<number>>(() => {
    if (mode === "rotate") return new Set(selectedPages);
    if (pageCount === undefined) return new Set();
    const parsed = parseRanges(split.ranges, pageCount);
    return new Set(parsed.error ? [] : rangesToPages(parsed.ranges));
  }, [mode, selectedPages, split.ranges, pageCount]);

  const commit = (pages: Set<number>) => {
    const sorted = [...pages].sort((a, b) => a - b);
    if (mode === "rotate") setSelectedPages(sorted);
    else setOption("split", { ...useDocumentsStore.getState().options.split, ranges: pagesToRangeText(sorted) });
  };

  const onToggle = (page: number, shift: boolean) => {
    // Se lee el estado vigente del store, no el del último render: así clics muy seguidos no se pisan.
    const live = useDocumentsStore.getState();
    const current =
      mode === "rotate"
        ? new Set(live.selectedPages)
        : new Set(
            live.pageCount === undefined || parseRanges(live.options.split.ranges, live.pageCount).error
              ? []
              : rangesToPages(parseRanges(live.options.split.ranges, live.pageCount).ranges),
          );
    const next = new Set(current);
    if (shift && lastClicked.current !== null) {
      // Mayús + clic: selecciona el intervalo desde la última página pulsada.
      const [a, b] = [lastClicked.current, page].sort((x, y) => x - y) as [number, number];
      for (let p = a; p <= b; p++) next.add(p);
    } else if (next.has(page)) next.delete(page);
    else next.add(page);
    lastClicked.current = page;
    commit(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-fg" title={file.file.name}>
            {file.file.name}
          </p>
          <p className="text-caption text-fg-secondary">
            {formatBytes(file.file.size)}
            {pageCount !== undefined && ` · ${pageCount} ${pageCount === 1 ? "página" : "páginas"}`}
            {selected.size > 0 && ` · ${selected.size} seleccionadas`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => pageCount && commit(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}
            disabled={!pageCount}
            className="h-7"
          >
            Seleccionar todo
          </Button>
          <Button variant="subtle" onClick={() => commit(new Set())} disabled={selected.size === 0} className="h-7">
            Ninguna
          </Button>
        </div>
      </div>
      <PageThumbnails
        file={file.file}
        selected={selected}
        rotations={mode === "rotate" ? rotations : undefined}
        onToggle={onToggle}
        onLoaded={setPageCount}
      />
      <p className="text-caption text-fg-tertiary">Haz clic para elegir páginas; con Mayús + clic eliges un intervalo.</p>
    </div>
  );
}
