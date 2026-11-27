"use client";

import { useT } from "@/lib/i18n";
import { useEffect } from "react";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { usePasteFiles } from "@/hooks/usePasteFiles";
import { useSelectorArchivos } from "@/hooks/useSelectorArchivos";
import { planAPdf } from "@/lib/documents/convertir-todo";
import { encolarTodoAPdf } from "@/services/documents/controller";
import { useDocumentsStore } from "@/store/documents-store";
import { ColaConversiones } from "./ColaConversiones";
import { DropZone } from "./DropZone";
import { FileList } from "./FileList";
import { NoticeStack } from "./NoticeStack";
import { ToolGrid } from "./ToolGrid";

/** /documentos: zona de soltar, la cuadrícula de herramientas, los archivos preparados y la cola de conversiones. */
export function DocumentosInicio() {
  const t = useT();
  const files = useDocumentsStore((s) => s.files);
  const addFiles = useDocumentsStore((s) => s.addFiles);
  const removeFile = useDocumentsStore((s) => s.removeFile);
  const reorderFiles = useDocumentsStore((s) => s.reorderFiles);
  const clearFiles = useDocumentsStore((s) => s.clearFiles);
  const selectTool = useDocumentsStore((s) => s.selectTool);
  const { abrir, entrada } = useSelectorArchivos(addFiles);
  // «Iniciar cola» manda a la cola, con un clic, todo lo que se puede volver PDF (cada tipo con su herramienta).
  const plan = planAPdf(files);

  useEffect(() => {
    selectTool(null); // en la cuadrícula no hay herramienta activa
  }, [selectTool]);
  usePasteFiles(addFiles);

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Documentos" }]}
      titulo={t("Documentos")}
      descripcion={t("Convierte y manipula PDF, Word, Excel y PowerPoint. Todo se hace dentro de la aplicación: tus archivos no salen de tu equipo.")}
      accion={
        <Button variant="accent" onClick={abrir} icon={<Glifo nombre="agregar" />}>
          {t("Agregar archivos")}
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
        <>
        <ColaConversiones />
        <section aria-labelledby="cola-titulo" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="cola-titulo" className="text-body font-semibold text-fg">
              {t("Archivos por convertir")}
            </h2>
            <Button variant="subtle" onClick={clearFiles} disabled={files.length === 0} className="h-7">
              {t("Quitar todos")}
            </Button>
          </div>
          {files.length === 0 ? (
            <p className="text-body text-fg-secondary">
              {t("Aún no hay archivos. Suéltalos en la zona de la izquierda, pégalos con Ctrl+V o usa «Agregar archivos».")}
            </p>
          ) : (
            <>
              {plan.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <Button variant="accent" icon={<Glifo nombre="reproducir" tam={14} />} onClick={encolarTodoAPdf}>
                    {t("Iniciar cola")}
                  </Button>
                  <p className="text-caption text-fg-secondary">
                    {files.some((f) => f.kind === "pdf") ? t("Se convierte a PDF lo que no lo es, uno tras otro. Para tus PDF, elige una herramienta.") : t("Se convierte a PDF, uno tras otro. Para otra cosa, elige una herramienta.")}
                  </p>
                </div>
              ) : (
                <p className="text-caption text-fg-secondary">{t("Para empezar, elige qué hacer en «Herramientas».")}</p>
              )}
              <FileList files={files} onReorder={reorderFiles} onRemove={removeFile} />
            </>
          )}
        </section>
        </>
      }
    />
  );
}
