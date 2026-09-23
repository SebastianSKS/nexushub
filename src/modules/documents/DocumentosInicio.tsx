"use client";

import { useEffect } from "react";
import Link from "next/link";
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
          <Link href="/documentos/carpetas" className="rounded-control reveal flex items-center gap-4 border border-stroke bg-layer p-4 shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white" aria-hidden>
              <Glifo nombre="carpeta" tam={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-fg">Mis tareas</span>
              <span className="block text-caption text-fg-secondary">Una carpeta por materia para guardar tus tareas y trabajos. Se crean desde tu horario, y puedes añadir, renombrar o quitar las que quieras.</span>
            </span>
          </Link>
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
