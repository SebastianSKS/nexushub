"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { ArrowUpload24Regular } from "@fluentui/react-icons";
import { MAX_FILES_PER_BATCH } from "@/lib/documents/limits";
import { formatBytes } from "@/lib/documents/format";
import { MAX_FILE_BYTES } from "@/lib/documents/limits";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  /** Extensiones aceptadas por el selector de archivos, p. ej. ".pdf,.docx". */
  accept?: string;
  multiple?: boolean;
  /** Archivos ya en la cola (se muestra el contador). */
  count?: number;
  compact?: boolean;
  title?: string;
}

/** Zona de arrastrar y soltar: borde punteado que se ilumina en acento, con contador de archivos. */
export function DropZone({ onFiles, accept, multiple = true, count = 0, compact = false, title }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0); // dragenter/leave se disparan por cada hijo: se cuenta la profundidad
  const [dragging, setDragging] = useState(false);
  const [incoming, setIncoming] = useState(0);

  const open = () => inputRef.current?.click();

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    depth.current++;
    setDragging(true);
    setIncoming(e.dataTransfer.items?.length ?? 0);
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  const headline = dragging
    ? incoming > 1
      ? `Suelta los ${incoming} archivos aquí`
      : "Suelta el archivo aquí"
    : (title ?? (multiple ? "Arrastra tus archivos aquí" : "Arrastra tu archivo aquí"));

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${headline}. Pulsa Enter para elegir archivos desde tu equipo.`}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={clsx(
        "rounded-control relative flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed text-center",
        "transition-[background-color,border-color,box-shadow] duration-enter ease-fluent",
        compact ? "px-6 py-5" : "px-6 py-10",
        dragging
          ? "border-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
          : "border-stroke-strong hover:border-accent hover:bg-layer",
      )}
      style={dragging ? { backgroundColor: "color-mix(in srgb, var(--accent) 12%, var(--layer))" } : undefined}
    >
      <span className={clsx("flex text-accent-text", dragging && "scale-110 transition-transform duration-enter ease-fluent")}>
        <ArrowUpload24Regular />
      </span>
      <p className={clsx("font-semibold text-fg", compact ? "text-body" : "text-subtitle")}>{headline}</p>
      <p className="text-body text-fg-secondary">
        o <span className="text-accent-text underline underline-offset-2">elige desde tu equipo</span>
        {!compact && " · también puedes pegar con Ctrl+V"}
      </p>
      {!compact && (
        <p className="text-caption text-fg-tertiary">
          Hasta {MAX_FILES_PER_BATCH} archivos por lote, {formatBytes(MAX_FILE_BYTES)} cada uno
        </p>
      )}
      {count > 0 && (
        <span
          className="tabular mt-1 rounded-full px-3 py-0.5 text-caption font-semibold text-fg"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 22%, var(--layer))" }}
          aria-live="polite"
        >
          {count} {count === 1 ? "archivo en la cola" : "archivos en la cola"}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        tabIndex={-1}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />
    </div>
  );
}
