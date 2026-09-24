"use client";

import { useEffect, useState } from "react";
import { Glifo } from "@/components/fluent/Glifo";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { officeDisponible, programaOfficePara } from "@/services/documents/motor/office";
import { useAjustesStore } from "@/store/ajustes-store";
import { useDocumentsStore } from "@/store/documents-store";
import type { ToolId } from "@/types/documents";

const PROGRAMA: Partial<Record<ToolId, string>> = { "word-to-pdf": "Word", "pdf-to-word": "Word", "excel-to-pdf": "Excel", "powerpoint-to-pdf": "PowerPoint" };

/**
 * Dice, antes de convertir, con qué motor se hará: con Microsoft Office si está instalado (misma calidad que guardarlo desde
 * Office) o con el motor básico de NexusHub. Solo aparece en las conversiones de Office, en la aplicación de escritorio.
 */
export function MotorOffice({ toolId }: { toolId: ToolId }) {
  const escritorio = useEsEscritorio();
  const usarOffice = useAjustesStore((s) => s.usarOffice);
  const opciones = useDocumentsStore((s) => (toolId === "pdf-to-word" ? s.options.pdfToWord : undefined));
  const [usa, setUsa] = useState<string | null | undefined>(undefined);
  const [hay, setHay] = useState<boolean | undefined>(undefined);
  const programa = PROGRAMA[toolId];

  useEffect(() => {
    if (!escritorio || !programa) return;
    void programaOfficePara(toolId, opciones).then(setUsa);
    void officeDisponible().then((d) => setHay(programa === "Word" ? d.word : programa === "Excel" ? d.excel : d.powerpoint));
  }, [escritorio, programa, toolId, opciones, usarOffice]);

  if (!escritorio || !programa || usa === undefined) return null;

  if (toolId === "pdf-to-word" && opciones?.mode !== "word") return null; // aquí Office es una opción que se elige en el panel
  const [texto, bien] = usa
    ? [`Se convertirá con Microsoft ${usa}: el resultado sale igual que guardarlo desde ${usa}.`, true]
    : !usarOffice
        ? ["Estás usando el motor básico de NexusHub. Puedes activar Office en Configuración › Documentos."]
        : hay === false
          ? [`Microsoft ${programa} no está instalado: se usa el motor básico de NexusHub. La calidad puede ser menor con documentos complejos.`]
          : [];
  if (!texto) return null;

  return (
    <p className={bien ? "flex items-start gap-2 rounded-control border border-stroke bg-layer px-3 py-2 text-caption text-fg" : "flex items-start gap-2 px-1 text-caption text-fg-secondary"}>
      <Glifo nombre={bien ? "exito" : "informacion"} tam={14} className={bien ? "mt-0.5 shrink-0 text-success" : "mt-0.5 shrink-0"} />
      <span>{texto}</span>
    </p>
  );
}
