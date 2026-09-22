"use client";

import { useRef, type ReactNode } from "react";

/**
 * Selector de archivos del sistema para un botón cualquiera (p. ej. la acción primaria «Agregar archivos»).
 * Devuelve `abrir()` y el <input> oculto que hay que renderizar.
 * En la aplicación de escritorio se sustituye por el diálogo nativo de Windows.
 */
export function useSelectorArchivos(
  onFiles: (files: File[]) => void,
  accept?: string,
  multiple = true,
): { abrir: () => void; entrada: ReactNode } {
  const ref = useRef<HTMLInputElement>(null);
  return {
    abrir: () => ref.current?.click(),
    entrada: (
      <input
        ref={ref}
        type="file"
        multiple={multiple}
        accept={accept}
        tabIndex={-1}
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    ),
  };
}
