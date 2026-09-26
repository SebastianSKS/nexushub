"use client";

import { useT } from "@/lib/i18n";
import { Reorder } from "framer-motion";
import clsx from "clsx";
import { ChevronDown20Regular, ChevronUp20Regular, Delete20Regular, ReOrderDotsVertical20Regular } from "@fluentui/react-icons";
import { IconButton } from "@/components/fluent/IconButton";
import { formatBytes } from "@/lib/documents/format";
import { KIND_LABEL } from "@/lib/documents/kinds";
import type { QueuedFile, ToolDefinition } from "@/types/documents";
import { KIND_ICONS } from "./toolIcons";

interface FileListProps {
  files: QueuedFile[];
  /** Herramienta activa: permite marcar los archivos que no le corresponden. */
  tool?: ToolDefinition;
  /** Permite reordenar arrastrando (Unir PDF, Imágenes a PDF). */
  reorderable?: boolean;
  disabled?: boolean;
  onReorder: (files: QueuedFile[]) => void;
  onRemove: (id: string) => void;
}

interface RowProps {
  file: QueuedFile;
  index: number;
  total: number;
  tool?: ToolDefinition;
  reorderable: boolean;
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

function Row({ file, index, total, tool, reorderable, disabled, onMove, onRemove }: RowProps) {
  const t = useT();
  const incompatible = !!tool && (!file.kind || !tool.accepts.includes(file.kind));
  return (
    <div
      className={clsx(
        "rounded-control flex items-center gap-3 border bg-layer px-3 py-2 shadow-card",
        incompatible ? "border-danger" : "border-stroke",
        reorderable && !disabled && "cursor-grab active:cursor-grabbing",
      )}
    >
      {reorderable && (
        <span className="flex text-fg-tertiary" aria-hidden>
          <ReOrderDotsVertical20Regular />
        </span>
      )}
      {reorderable && (
        <span className="tabular w-5 shrink-0 text-center text-caption text-fg-tertiary" aria-hidden>
          {index + 1}
        </span>
      )}
      <span className={clsx("flex shrink-0", incompatible ? "text-danger-fg" : "text-accent-text")} aria-hidden>
        {file.kind ? KIND_ICONS[file.kind] : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg" title={file.file.name}>
          {file.file.name}
        </p>
        <p className={clsx("truncate text-caption", incompatible ? "text-danger-fg" : "text-fg-secondary")}>
          {incompatible
            ? t("Es un archivo {tipo}: no corresponde a {herramienta}.", { tipo: file.kind ? t(KIND_LABEL[file.kind]) : t("desconocido"), herramienta: t(tool!.name) })
            : `${file.kind ? t(KIND_LABEL[file.kind]) : ""} · ${formatBytes(file.file.size)}`}
        </p>
      </div>
      {reorderable && (
        <>
          <IconButton label={t("Subir {nombre}", { nombre: file.file.name })} disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            <ChevronUp20Regular />
          </IconButton>
          <IconButton label={t("Bajar {nombre}", { nombre: file.file.name })} disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
            <ChevronDown20Regular />
          </IconButton>
        </>
      )}
      <IconButton label={t("Quitar {nombre}", { nombre: file.file.name })} disabled={disabled} onClick={onRemove}>
        <Delete20Regular />
      </IconButton>
    </div>
  );
}

/** Lista de archivos en cola. Con `reorderable` se ordena arrastrando o con los botones de flecha. */
export function FileList({ files, tool, reorderable = false, disabled = false, onReorder, onRemove }: FileListProps) {
  const t = useT();
  const move = (index: number, delta: -1 | 1) => {
    const next = [...files];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onReorder(next);
  };

  if (reorderable && !disabled) {
    return (
      <Reorder.Group
        axis="y"
        values={files}
        onReorder={onReorder}
        aria-label={t("Archivos en cola, arrastra para reordenar")}
        className="flex flex-col gap-2"
      >
        {files.map((f, i) => (
          <Reorder.Item key={f.id} value={f} className="list-none" whileDrag={{ scale: 1.01, zIndex: 10 }}>
            <Row
              file={f}
              index={i}
              total={files.length}
              tool={tool}
              reorderable
              disabled={disabled}
              onMove={(d) => move(i, d)}
              onRemove={() => onRemove(f.id)}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    );
  }

  return (
    <ul aria-label={t("Archivos en cola")} className="flex flex-col gap-2">
      {files.map((f, i) => (
        <li key={f.id}>
          <Row
            file={f}
            index={i}
            total={files.length}
            tool={tool}
            reorderable={reorderable}
            disabled={disabled}
            onMove={(d) => move(i, d)}
            onRemove={() => onRemove(f.id)}
          />
        </li>
      ))}
    </ul>
  );
}
