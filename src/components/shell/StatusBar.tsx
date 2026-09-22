"use client";

import {
  CheckmarkCircle16Regular,
  DocumentPdf16Regular,
  MusicNote216Regular,
  Video16Regular,
} from "@fluentui/react-icons";
import { useAppStore } from "@/store/app-store";

/** Barra de estado de 28px: operación en curso, reproducción actual y archivos procesados. */
export function StatusBar() {
  const operation = useAppStore((s) => s.operation);
  const nowPlaying = useAppStore((s) => s.nowPlaying);
  const filesProcessed = useAppStore((s) => s.filesProcessed);

  return (
    <footer className="grid h-statusbar shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-stroke px-4 text-caption text-fg-secondary">
      <div role="status" aria-live="polite" className="flex min-w-0 items-center gap-2">
        {operation ? (
          <>
            <span className="truncate">{operation.label}</span>
            {operation.progress !== undefined && (
              <>
                <span
                  role="progressbar"
                  aria-label={operation.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(operation.progress)}
                  className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-layer-alt"
                >
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-enter ease-fluent"
                    style={{ width: `${operation.progress}%` }}
                  />
                </span>
                <span className="tabular shrink-0">{Math.round(operation.progress)}%</span>
              </>
            )}
          </>
        ) : (
          <>
            <CheckmarkCircle16Regular className="shrink-0 text-success-fg" aria-hidden />
            <span>Listo</span>
          </>
        )}
      </div>

      <div className="flex min-w-0 max-w-[40vw] items-center justify-center gap-2" aria-live="polite">
        {nowPlaying ? (
          <>
            {nowPlaying.kind === "video" ? (
              <Video16Regular className="shrink-0" aria-hidden />
            ) : (
              <MusicNote216Regular className="shrink-0" aria-hidden />
            )}
            <span className="truncate">
              <span className="text-fg">{nowPlaying.title}</span>
              {nowPlaying.subtitle && <span> · {nowPlaying.subtitle}</span>}
            </span>
          </>
        ) : (
          <span className="text-fg-tertiary">Nada en reproducción</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <DocumentPdf16Regular className="shrink-0" aria-hidden />
        <span className="tabular">
          {filesProcessed} {filesProcessed === 1 ? "archivo procesado" : "archivos procesados"}
        </span>
      </div>
    </footer>
  );
}
