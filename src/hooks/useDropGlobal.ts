"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDocumentsStore } from "@/store/documents-store";

/**
 * Soltar un archivo en cualquier parte de la ventana (no solo en la zona de soltar de Documentos)
 * lo manda directo ahí. También evita que, al soltarlo fuera de una zona reconocida, el navegador
 * lo abra por su cuenta y reemplace toda la aplicación.
 */
export function useDropGlobal() {
  const router = useRouter();

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.defaultPrevented) return; // ya lo atendió una zona de soltar propia (p. ej. dentro de Documentos)
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      useDocumentsStore.getState().addFiles(files);
      if (!window.location.pathname.startsWith("/documentos")) router.push("/documentos");
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [router]);
}
