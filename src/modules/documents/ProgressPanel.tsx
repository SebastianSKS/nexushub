"use client";

import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { ProgressBar } from "@/components/fluent/ProgressBar";
import { cancelRun } from "@/services/documents/controller";
import { useDocumentsStore } from "@/store/documents-store";

/** Progreso determinado con porcentaje real y el paso en curso. Nunca un spinner sin contexto. */
export function ProgressPanel({ toolName }: { toolName: string }) {
  const progress = useDocumentsStore((s) => s.progress);
  const message = useDocumentsStore((s) => s.progressMessage);

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-body font-semibold text-fg">{toolName}</h3>
        <span className="tabular text-body text-fg" aria-hidden>
          {Math.round(progress)}%
        </span>
      </div>
      <ProgressBar value={progress} label={`${toolName}: ${Math.round(progress)}%`} />
      <p className="mt-2 truncate text-caption text-fg-secondary" role="status" aria-live="polite" title={message}>
        {message}
      </p>
      <Button onClick={cancelRun} className="mt-3 w-full">
        Cancelar
      </Button>
    </Card>
  );
}
