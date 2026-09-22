"use client";

import { useEffect } from "react";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { usePasteFiles } from "@/hooks/usePasteFiles";
import { useSelectorArchivos } from "@/hooks/useSelectorArchivos";
import { useDocumentsStore } from "@/store/documents-store";
import { DropZone } from "./DropZone";
import { FileList } from "./FileList";
import { NoticeStack } from "./NoticeStack";
import { ToolGrid } from "./ToolGrid";

/** /documentos: zona de soltar, cola de archivos y la cuadrícula de herramientas. */
export function DocumentosInicio() {
  const files = useDocumentsStore((s) => s.files);
  const addFiles = useDocumentsStore((s) => s.addFiles);
  const removeFile = useDocumentsStore((s) => s.removeFile);
  const reorderFiles = useDocumentsStore((s) => s.reorderFiles);
  const clearFiles = useDocumentsStore((s) => s.clearFiles);
  const selectTool = useDocumentsStore((s) => s.selectTool);
  const { abrir, entrada } = useSelectorArchivos(addFiles);

  useEffect(() => {
    selectTool(null); // en la cuadrícula no hay herramienta activa
  }, [selectTool]);
  usePasteFiles(addFiles);

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Documentos" }]}
      titulo="Documentos"
      descripcion="Convierte y manipula PDF, Word, Excel y PowerPoint. Todo se hace dentro de la aplicación: tus archivos no salen de tu equipo."
      accion={
        <Button variant="accent" onClick={abrir} icon={<Glifo nombre="agregar" />}>
          Agregar archivos
        </Button>
      }
      principal={
        <>
          {entrada}
          <NoticeStack />
          <DropZone onFiles={addFiles} count={files.length} />
          <ToolGrid />
        </>
      }
      lateral={
        <section aria-labelledby="cola-titulo" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="cola-titulo" className="text-body font-semibold text-fg">
              Archivos en la cola
            </h2>
            <Button variant="subtle" onClick={clearFiles} disabled={files.length === 0} className="h-7">
              Quitar todos
            </Button>
          </div>
          {files.length === 0 ? (
            <p className="text-body text-fg-secondary">
              Aún no hay archivos. Suéltalos en la zona de la izquierda, pégalos con Ctrl+V o usa «Agregar archivos».
            </p>
          ) : (
            <FileList files={files} onReorder={reorderFiles} onRemove={removeFile} />
          )}
        </section>
      }
    />
  );
}
