import type { ToolDefinition, ToolId } from "@/types/documents";
import { MAX_FILES_PER_BATCH } from "./limits";

/** Catálogo de herramientas de Documentos. Todas funcionan dentro de la aplicación. */
export const TOOLS: readonly ToolDefinition[] = [
  {
    id: "word-to-pdf",
    action: "Convertir a PDF",
    name: "Word a PDF",
    description: "Convierte documentos de Word (.docx) en PDF.",
    accepts: ["word"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "pdf-to-word",
    action: "Convertir a Word",
    name: "PDF a Word",
    description: "Convierte un PDF en un documento .docx editable.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "DOCX",
  },
  {
    id: "excel-to-pdf",
    action: "Convertir a PDF",
    name: "Excel a PDF",
    description: "Convierte hojas de cálculo .xlsx en PDF.",
    accepts: ["excel"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "powerpoint-to-pdf",
    action: "Convertir a PDF",
    name: "PowerPoint a PDF",
    description: "Convierte presentaciones .pptx en PDF.",
    accepts: ["powerpoint"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "merge",
    action: "Unir PDF",
    name: "Unir PDF",
    description: "Combina varios PDF en uno solo. Ordénalos arrastrando.",
    accepts: ["pdf"],
    minFiles: 2,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "split",
    action: "Dividir PDF",
    name: "Dividir PDF",
    description: "Extrae páginas o rangos eligiéndolos en las miniaturas.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    output: "PDF",
  },
  {
    id: "compress",
    action: "Comprimir PDF",
    name: "Comprimir PDF",
    description: "Reduce el peso con tres niveles de compresión.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "images-to-pdf",
    action: "Crear PDF",
    name: "Imágenes a PDF",
    description: "Junta imágenes JPG y PNG en un PDF con orientación y margen.",
    accepts: ["image"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "pdf-to-images",
    action: "Convertir a imágenes",
    name: "PDF a imágenes",
    description: "Convierte cada página en PNG y descárgalas en un ZIP.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "ZIP",
  },
  {
    id: "rotate",
    action: "Aplicar giro",
    name: "Rotar páginas",
    description: "Gira páginas sueltas o todo el documento.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    output: "PDF",
  },
  {
    id: "protect-pdf",
    action: "Proteger PDF",
    name: "Proteger con contraseña",
    description: "Pide una contraseña para poder abrir el PDF, con cualquier lector.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "unlock-pdf",
    action: "Quitar contraseña",
    name: "Quitar contraseña",
    description: "Abre un PDF protegido y guarda una copia sin contraseña.",
    accepts: ["pdf"],
    minFiles: 1,
    maxFiles: MAX_FILES_PER_BATCH,
    output: "PDF",
  },
  {
    id: "compare-pdf",
    action: "Comparar",
    name: "Comparar dos PDF",
    description: "Resalta el texto que cambió entre dos versiones de un documento.",
    accepts: ["pdf"],
    minFiles: 2,
    maxFiles: 2,
    output: "HTML",
  },
];

export function getTool(id: ToolId): ToolDefinition {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) throw new Error(`Herramienta desconocida: ${id}`);
  return tool;
}

export function isToolId(value: unknown): value is ToolId {
  return typeof value === "string" && TOOLS.some((t) => t.id === value);
}
