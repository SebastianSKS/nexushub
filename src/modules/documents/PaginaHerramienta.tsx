"use client";

import { useT, T, traducir } from "@/lib/i18n";
import { useEffect } from "react";
import { Button } from "@/components/fluent/Button";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { usePasteFiles } from "@/hooks/usePasteFiles";
import { KIND_EXTENSIONS } from "@/lib/documents/kinds";
import { getTool } from "@/lib/documents/tools";
import { getBlocker, startRun } from "@/services/documents/controller";
import { useDocumentsStore } from "@/store/documents-store";
import type { ToolId } from "@/types/documents";
import { DropZone } from "./DropZone";
import { FileList } from "./FileList";
import { MotorOffice } from "./MotorOffice";
import { NoticeStack } from "./NoticeStack";
import { OptionsPanel } from "./options/OptionsPanel";
import { PagePicker } from "./PagePicker";
import { ProgressPanel } from "./ProgressPanel";
import { OrganizarPaginas } from "./OrganizarPaginas";
import { ResultsPanel } from "./ResultsPanel";

/** Texto del botón principal: «Unir 3 archivos», «Convertir a PDF»… */
function textoAccion(toolId: ToolId, base: string, n: number): string {
  if (toolId === "merge" && n >= 2) return traducir("Unir {n} archivos", { n });
  if (toolId === "images-to-pdf" && n >= 1) return n === 1 ? traducir("Crear PDF con 1 imagen") : traducir("Crear PDF con {n} imágenes", { n });
  return traducir(base);
}

/** /documentos/[herramienta]: archivos a la izquierda; opciones, progreso y resultado en el panel lateral. */
export function PaginaHerramienta({ toolId }: { toolId: ToolId }) {
  const t = useT();
  const tool = getTool(toolId);
  const files = useDocumentsStore((s) => s.files);
  const status = useDocumentsStore((s) => s.runStatus);
  const pageCount = useDocumentsStore((s) => s.pageCount);
  const addFiles = useDocumentsStore((s) => s.addFiles);
  const removeFile = useDocumentsStore((s) => s.removeFile);
  const reorderFiles = useDocumentsStore((s) => s.reorderFiles);
  const selectTool = useDocumentsStore((s) => s.selectTool);
  // Se suscribe a lo que getBlocker lee para que el motivo se actualice al instante.
  useDocumentsStore((s) => s.options);

  useEffect(() => {
    selectTool(toolId);
  }, [toolId, selectTool]);
  usePasteFiles(addFiles);

  const corriendo = status === "running";
  const single = tool.maxFiles === 1;
  const conPaginas = toolId === "split" || toolId === "rotate" || toolId === "organize";
  const reordenable = toolId === "merge" || toolId === "images-to-pdf";
  const accept = tool.accepts.flatMap((k) => KIND_EXTENSIONS[k]).join(",");
  const bloqueo = getBlocker(toolId, pageCount);

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Documentos", href: "/documentos" }, { etiqueta: t(tool.name) }]}
      titulo={t(tool.name)}
      descripcion={t(tool.description)}
      accion={
        <Button variant="accent" onClick={startRun} disabled={bloqueo !== null || corriendo}>
          {textoAccion(toolId, tool.action, files.length)}
        </Button>
      }
      motivo={corriendo ? t("Procesando: puedes seguir el avance en el panel de progreso.") : bloqueo ? t(bloqueo) : bloqueo}
      principal={
        <>
          <NoticeStack />
          {files.length === 0 || (!conPaginas && !single) ? (
            <DropZone
              onFiles={addFiles}
              accept={accept}
              multiple={!single}
              count={files.length}
              compact={files.length > 0}
              title={files.length > 0 ? T("Añadir más archivos") : undefined}
            />
          ) : null}

          {files.length > 0 &&
            (toolId === "organize" ? (
              <OrganizarPaginas key={files[0]!.id} file={files[0]!} />
            ) : conPaginas ? (
              <PagePicker key={files[0]!.id} file={files[0]!} mode={toolId === "split" ? "split" : "rotate"} />
            ) : (
              <FileList
                files={files}
                tool={tool}
                reorderable={reordenable}
                disabled={corriendo}
                onReorder={reorderFiles}
                onRemove={removeFile}
              />
            ))}

          {files.length > 0 && single && !conPaginas && (
            <DropZone onFiles={addFiles} accept={accept} multiple={false} compact title={T("Cambiar archivo")} />
          )}
        </>
      }
      lateral={
        <>
          <MotorOffice toolId={toolId} />
          <OptionsPanel toolId={toolId} />
          {status === "running" && <ProgressPanel toolName={tool.name} />}
          {status === "done" && <ResultsPanel />}
        </>
      }
    />
  );
}
