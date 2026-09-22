"use client";

import { useEffect } from "react";

/** Recibe archivos pegados desde el portapapeles (Ctrl+V) mientras el componente está montado. */
export function usePasteFiles(onFiles: (files: File[]) => void) {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return; // texto pegado en un campo: no es asunto nuestro
      e.preventDefault();
      onFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);
}
