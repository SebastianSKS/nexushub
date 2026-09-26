import { T } from "@/lib/i18n";
import type { ShortcutDefinition } from "@/types";

/**
 * Fuente única de los atajos documentados en la página /atajos.
 * Solo se listan atajos que realmente están implementados.
 */
export const SHORTCUTS: readonly ShortcutDefinition[] = [
  { keys: ["Alt", "←"], description: T("Atrás (historial)") },
  { keys: ["Alt", "→"], description: T("Adelante (historial)") },
  { keys: [T("Botón 4 del mouse")], description: T("Atrás") },
  { keys: [T("Botón 5 del mouse")], description: T("Adelante") },
  { keys: ["Esc"], description: T("Subir un nivel en la jerarquía (la miga anterior)") },
  { keys: ["Ctrl", "0"], description: T("Ir a Inicio") },
  { keys: ["Ctrl", "1"], description: T("Ir a Video") },
  { keys: ["Ctrl", "2"], description: T("Ir a Música") },
  { keys: ["Ctrl", "3"], description: T("Ir a Documentos") },
  { keys: ["Ctrl", "4"], description: T("Ir a Calendario") },
  { keys: ["Ctrl", "5"], description: T("Ir a Horario") },
  { keys: ["Ctrl", "6"], description: T("Ir a Calculadora") },
  { keys: ["Ctrl", "K"], description: T("Abrir el buscador global") },
  { keys: [T("Espacio")], description: T("Reproducir o pausar (si el foco no está en un campo)") },
  { keys: ["?"], description: T("Mostrar esta página de atajos") },
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
