"use client";

import Link from "next/link";
import clsx from "clsx";
import { rutaHerramienta } from "@/lib/rutas";
import type { ToolDefinition } from "@/types/documents";
import { TOOL_ICONS } from "./toolIcons";

interface ToolCardProps {
  tool: ToolDefinition;
  /** Con archivos en cola: false atenúa la tarjeta porque no admite esos archivos. */
  compatible: boolean;
  /** Con archivos en cola compatibles se resalta como sugerencia. */
  suggested: boolean;
}

/** Tarjeta de herramienta: un enlace real a /documentos/<herramienta> (clic con rueda, menú contextual). */
export function ToolCard({ tool, compatible, suggested }: ToolCardProps) {
  const clases = clsx(
    "rounded-control reveal group relative flex min-h-[132px] flex-col items-start gap-3 border bg-layer p-4 text-left shadow-card",
    "transition-[background-color,border-color,transform,opacity] duration-exit ease-fluent",
    compatible ? "hover:bg-layer-alt active:scale-[0.99]" : "cursor-not-allowed opacity-40",
    suggested ? "border-accent" : "border-stroke",
  );

  const contenido = (
    <>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-control text-accent-text"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
        aria-hidden
      >
        {TOOL_ICONS[tool.id]}
      </span>
      <span className="min-w-0">
        <span className="block text-body font-semibold text-fg">{tool.name}</span>
        <span className="mt-0.5 line-clamp-2 block text-caption text-fg-secondary">{tool.description}</span>
      </span>
    </>
  );

  return compatible ? (
    <Link href={rutaHerramienta(tool.id)} className={clases}>
      {contenido}
    </Link>
  ) : (
    <div aria-disabled className={clases}>
      {contenido}
    </div>
  );
}
