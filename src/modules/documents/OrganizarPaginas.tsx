"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useRef } from "react";
import { formatBytes } from "@/lib/documents/format";
import { useDocumentsStore } from "@/store/documents-store";
import type { QueuedFile } from "@/types/documents";
import { PageThumbnails } from "./PageThumbnails";

/** Miniaturas del PDF en el orden que va a quedar. Se eligen páginas con clic y se mueven o eliminan desde el panel de opciones. */
export function OrganizarPaginas({ file }: { file: QueuedFile }) {
  const t = useT();
  const order = useDocumentsStore((s) => s.options.organize.order);
  const selectedPages = useDocumentsStore((s) => s.selectedPages);
  const pageCount = useDocumentsStore((s) => s.pageCount);
  const setOption = useDocumentsStore((s) => s.setOption);
  const setSelectedPages = useDocumentsStore((s) => s.setSelectedPages);
  const setPageCount = useDocumentsStore((s) => s.setPageCount);
  const lastClicked = useRef<number | null>(null);

  // Al terminar de cargar el documento, el orden inicial es el suyo.
  const cargado = (n: number) => {
    setPageCount(n);
    setOption("organize", { order: Array.from({ length: n }, (_, i) => i + 1) });
  };

  useEffect(() => () => setSelectedPages([]), [setSelectedPages]);

  const onToggle = (page: number, shift: boolean) => {
    const vivo = useDocumentsStore.getState();
    const actual = new Set(vivo.selectedPages);
    if (shift && lastClicked.current !== null) {
      // Mayús + clic: el intervalo se toma según la posición actual de cada página, no su número original.
      const o = vivo.options.organize.order;
      const a = o.indexOf(lastClicked.current);
      const b = o.indexOf(page);
      if (a >= 0 && b >= 0) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) actual.add(o[i]!);
    } else if (actual.has(page)) actual.delete(page);
    else actual.add(page);
    lastClicked.current = page;
    setSelectedPages([...actual]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0">
        <p className="truncate text-body font-semibold text-fg" title={file.file.name}>
          {file.file.name}
        </p>
        <p className="text-caption text-fg-secondary">
          {formatBytes(file.file.size)}
          {pageCount !== undefined && ` · ${pageCount === 1 ? t("1 página") : t("{n} páginas", { n: pageCount })}`}
          {pageCount !== undefined && order.length !== pageCount && order.length > 0 && ` · ${t("quedarán {n}", { n: order.length })}`}
          {selectedPages.length > 0 && ` · ${t("{n} seleccionadas", { n: selectedPages.length })}`}
        </p>
      </div>
      <PageThumbnails file={file.file} selected={new Set(selectedPages)} order={order.length > 0 ? order : undefined} onToggle={onToggle} onLoaded={cargado} />
      <p className="text-caption text-fg-tertiary">{t("Haz clic en las páginas que quieras mover o eliminar (con Mayús eliges un intervalo) y usa los botones del panel.")}</p>
    </div>
  );
}
