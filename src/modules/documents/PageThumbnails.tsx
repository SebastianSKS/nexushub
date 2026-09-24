"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { OpenedPdf } from "@/services/documents/pdfjs";
import { InfoBar } from "@/components/fluent/InfoBar";
import { describeError } from "@/services/documents/errors";
import { openPdf } from "@/services/documents/pdfjs";
import { PageThumb } from "./PageThumb";

interface PageThumbnailsProps {
  file: File;
  selected: ReadonlySet<number>;
  rotations?: Record<string, number>;
  /** Páginas originales en el orden en que se muestran (Organizar); sin él, todas en su orden. */
  order?: readonly number[];
  onToggle: (page: number, shift: boolean) => void;
  onLoaded: (pageCount: number) => void;
}

/** Cuadrícula de miniaturas de todas las páginas de un PDF (renderizadas con pdf.js en el navegador). */
export function PageThumbnails({ file, selected, rotations, order, onToggle, onLoaded }: PageThumbnailsProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    let opened: OpenedPdf | null = null;
    setDoc(null);
    setError(null);

    openPdf(file)
      .then((pdf) => {
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        opened = pdf;
        setDoc(pdf.doc);
        onLoadedRef.current(pdf.doc.numPages);
      })
      .catch((err) => !cancelled && setError(describeError(err)));

    return () => {
      cancelled = true;
      void opened?.destroy();
    };
  }, [file]);

  if (error) {
    return (
      <InfoBar severity="error" title={error.message}>
        {error.hint}
      </InfoBar>
    );
  }

  if (!doc) {
    // Skeleton con la forma final: misma cuadrícula y proporción que las miniaturas reales.
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3" aria-busy="true" aria-label="Cargando páginas">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-control border border-stroke p-2">
            <div className="skeleton aspect-[3/4] w-full" />
            <div className="skeleton mx-auto mt-2 h-3 w-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {(order ?? Array.from({ length: doc.numPages }, (_, i) => i + 1)).map((page, posicion) => (
        <PageThumb
          key={page}
          doc={doc}
          page={page}
          selected={selected.has(page)}
          rotation={rotations?.[page] ?? 0}
          etiqueta={order ? (page === posicion + 1 ? `${page}` : `${posicion + 1} (era ${page})`) : undefined}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
