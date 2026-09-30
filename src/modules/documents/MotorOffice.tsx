"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Glifo } from "@/components/fluent/Glifo";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { officeDisponible, programaOfficePara, type ProgramaOffice } from "@/services/documents/motor/office";
import { useAjustesStore } from "@/store/ajustes-store";
import { useDocumentsStore } from "@/store/documents-store";
import type { ToolId } from "@/types/documents";

/** Qué programa de office hace cada conversión (el nombre en pantalla lo pone el programa, no este archivo). */
const PROGRAMA: Partial<Record<ToolId, "word" | "excel" | "powerpoint">> = { "word-to-pdf": "word", "pdf-to-word": "word", "excel-to-pdf": "excel", "powerpoint-to-pdf": "powerpoint" };

/**
 * Dice, antes de convertir, con qué motor se hará: con el programa de office si está instalado (misma calidad que
 * guardarlo desde ahí) o con el motor básico de Nexo. Solo aparece en las conversiones de Office, en la aplicación de
 * escritorio.
 */
export function MotorOffice({ toolId }: { toolId: ToolId }) {
  const t = useT();
  const escritorio = useEsEscritorio();
  const usarOffice = useAjustesStore((s) => s.usarOffice);
  const opciones = useDocumentsStore((s) => (toolId === "pdf-to-word" ? s.options.pdfToWord : undefined));
  const [usa, setUsa] = useState<string | null | undefined>(undefined);
  const [hay, setHay] = useState<ProgramaOffice | undefined>(undefined);
  const programa = PROGRAMA[toolId];

  useEffect(() => {
    if (!escritorio || !programa) return;
    void programaOfficePara(toolId, opciones).then(setUsa);
    void officeDisponible().then((d) => setHay(d[programa]));
  }, [escritorio, programa, toolId, opciones, usarOffice]);

  if (!escritorio || !programa || usa === undefined) return null;

  if (toolId === "pdf-to-word" && opciones?.mode !== "word") return null; // aquí el programa de office es una opción que se elige en el panel
  const [texto, bien] = usa
    ? [t("Se convertirá con {programa}: el resultado sale igual que guardarlo desde {programa}.", { programa: usa }), true]
    : !usarOffice
        ? [t("Estás usando el motor básico de Nexo. Puedes activar el programa de office en Configuración › Documentos.")]
        : hay && !hay.disponible
          ? [t("{programa} no está instalado: se usa el motor básico de Nexo. La calidad puede ser menor con documentos complejos.", { programa: hay.nombre })]
          : [];
  if (!texto) return null;

  return (
    <p className={bien ? "flex items-start gap-2 rounded-control border border-stroke bg-layer px-3 py-2 text-caption text-fg" : "flex items-start gap-2 px-1 text-caption text-fg-secondary"}>
      <Glifo nombre={bien ? "exito" : "informacion"} tam={14} className={bien ? "mt-0.5 shrink-0 text-success" : "mt-0.5 shrink-0"} />
      <span>{texto}</span>
    </p>
  );
}
