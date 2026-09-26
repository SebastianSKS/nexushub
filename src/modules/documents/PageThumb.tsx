"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import clsx from "clsx";
import { Checkmark16Filled } from "@fluentui/react-icons";

interface PageThumbProps {
  doc: PDFDocumentProxy;
  page: number;
  selected: boolean;
  /** Giro acumulado a previsualizar (0, 90, 180, 270). */
  rotation: number;
  /** Texto bajo la miniatura; por defecto, el número de página. */
  etiqueta?: string;
  onToggle: (page: number, shift: boolean) => void;
}

/** Miniatura de una página. Se dibuja solo cuando entra en pantalla, para que 200 páginas no bloqueen la interfaz. */
export function PageThumb({ doc, page, selected, rotation, etiqueta, onToggle }: PageThumbProps) {
  const t = useT();
  const boxRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;

    (async () => {
      const pdfPage = await doc.getPage(page);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const base = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: (160 * dpr) / base.width });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      task = pdfPage.render({ canvas, viewport, background: "#ffffff" });
      await task.promise;
      pdfPage.cleanup();
      if (!cancelled) setReady(true);
    })().catch(() => {
      /* render cancelado al desmontar: no es un error */
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, page]);

  const turned = rotation % 180 !== 0;

  return (
    <button
      ref={boxRef}
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={t("Página {n}", { n: page })}
      onClick={(e) => onToggle(page, e.shiftKey)}
      className={clsx(
        "rounded-control reveal group relative flex flex-col items-center gap-1.5 border p-2 transition-colors duration-exit ease-fluent",
        selected ? "border-accent" : "border-stroke hover:bg-layer-alt",
      )}
      style={selected ? { backgroundColor: "color-mix(in srgb, var(--accent) 16%, var(--layer))" } : undefined}
    >
      <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-input">
        {!ready && <span className="skeleton absolute inset-0" aria-hidden />}
        <canvas
          ref={canvasRef}
          aria-hidden
          className={clsx("absolute inset-0 h-full w-full object-contain shadow-card", !ready && "opacity-0")}
          style={{
            transform: `rotate(${rotation}deg) scale(${turned ? 0.75 : 1})`,
            transition: "transform var(--dur-enter) var(--ease)",
          }}
        />
      </span>
      <span className="tabular text-caption text-fg-secondary">{etiqueta ?? page}</span>
      {selected && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-on"
        >
          <Checkmark16Filled />
        </span>
      )}
    </button>
  );
}
