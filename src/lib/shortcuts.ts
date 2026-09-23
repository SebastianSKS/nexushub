import type { ShortcutDefinition } from "@/types";

/**
 * Fuente única de los atajos documentados en la página /atajos.
 * Solo se listan atajos que realmente están implementados.
 */
export const SHORTCUTS: readonly ShortcutDefinition[] = [
  { keys: ["Alt", "←"], description: "Atrás (historial)" },
  { keys: ["Alt", "→"], description: "Adelante (historial)" },
  { keys: ["Botón 4 del mouse"], description: "Atrás" },
  { keys: ["Botón 5 del mouse"], description: "Adelante" },
  { keys: ["Esc"], description: "Subir un nivel en la jerarquía (la miga anterior)" },
  { keys: ["Ctrl", "0"], description: "Ir a Inicio" },
  { keys: ["Ctrl", "1"], description: "Ir a Video" },
  { keys: ["Ctrl", "2"], description: "Ir a Música" },
  { keys: ["Ctrl", "3"], description: "Ir a Documentos" },
  { keys: ["Ctrl", "4"], description: "Ir a Calendario" },
  { keys: ["Ctrl", "5"], description: "Ir a Horario" },
  { keys: ["Ctrl", "6"], description: "Ir a Calculadora" },
  { keys: ["Ctrl", "K"], description: "Abrir el buscador global" },
  { keys: ["Espacio"], description: "Reproducir o pausar (si el foco no está en un campo)" },
  { keys: ["?"], description: "Mostrar esta página de atajos" },
];

/** ¿El foco está en un campo donde escribir debe ganar sobre los atajos? */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** ¿El foco está en un control que ya usa Espacio o Enter para activarse? */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  return (
    target.closest(
      "button, a[href], summary, [role=button], [role=checkbox], [role=radio], [role=switch], [role=option], [role=combobox], [role=slider], [role=menuitem]",
    ) !== null
  );
}
