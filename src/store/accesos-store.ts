import { create } from "zustand";

const CLAVE = "nexushub-accesos";

/** Un acceso directo a una herramienta en internet (Word en línea, Canva, Drive…). Se abre en el navegador. */
export interface Acceso {
  id: string;
  nombre: string;
  url: string;
  /** Color del cuadro (hexadecimal). */
  color: string;
}

/** Los de siempre. Se pueden quitar, cambiar y añadir; «Restaurar» los devuelve. */
export const ACCESOS_PREDETERMINADOS: readonly Acceso[] = [
  { id: "word", nombre: "Word", url: "https://www.office.com/launch/word", color: "#2b579a" },
  { id: "excel", nombre: "Excel", url: "https://www.office.com/launch/excel", color: "#217346" },
  { id: "powerpoint", nombre: "PowerPoint", url: "https://www.office.com/launch/powerpoint", color: "#c43e1c" },
  { id: "canva", nombre: "Canva", url: "https://www.canva.com", color: "#00a3ad" },
  { id: "drive", nombre: "Google Drive", url: "https://drive.google.com", color: "#1a73e8" },
  { id: "docs", nombre: "Documentos de Google", url: "https://docs.google.com/document/u/0/", color: "#4285f4" },
  { id: "classroom", nombre: "Classroom", url: "https://classroom.google.com", color: "#0f9d58" },
  { id: "gmail", nombre: "Gmail", url: "https://mail.google.com", color: "#d93025" },
];

export const COLORES_ACCESO = ["#2b7de9", "#3fb6f5", "#14b8a6", "#3fae5a", "#e3b60f", "#f0812a", "#e5484d", "#e5509f", "#8b5cf6", "#7c8794"] as const;

/** Acepta «canva.com» o «https://canva.com»; solo direcciones web (http o https). null si no sirve. */
export function normalizarUrl(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const conEsquema = /^https?:\/\//i.test(t) ? t : /^[a-z][a-z0-9+.-]*:/i.test(t) ? "" : `https://${t}`;
  if (!conEsquema) return null; // otros esquemas (file:, javascript:, ms-word:…): no se admiten
  try {
    const u = new URL(conEsquema);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

function accesoValido(x: unknown): Acceso | null {
  if (typeof x !== "object" || x === null) return null;
  const a = x as Record<string, unknown>;
  if (typeof a.id !== "string" || typeof a.nombre !== "string" || !a.nombre.trim() || typeof a.url !== "string") return null;
  const url = normalizarUrl(a.url);
  if (!url) return null;
  return { id: a.id, nombre: a.nombre.trim().slice(0, 40), url, color: typeof a.color === "string" && /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : COLORES_ACCESO[0] };
}

function leer(): Acceso[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (crudo === null) return [...ACCESOS_PREDETERMINADOS]; // nunca se ha tocado: los de siempre
    const lista = JSON.parse(crudo) as unknown;
    return Array.isArray(lista) ? lista.map(accesoValido).filter((a): a is Acceso => a !== null) : [...ACCESOS_PREDETERMINADOS];
  } catch {
    return [...ACCESOS_PREDETERMINADOS];
  }
}

function escribir(accesos: Acceso[]) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(accesos));
  } catch {
    /* modo incógnito: dura solo esta sesión */
  }
}

interface AccesosState {
  cargado: boolean;
  accesos: Acceso[];
  cargar: () => void;
  guardar: (a: Omit<Acceso, "id"> & { id?: string }) => void;
  quitar: (id: string) => void;
  restaurar: () => void;
}

export const useAccesosStore = create<AccesosState>((set, get) => ({
  cargado: false,
  accesos: [],

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, accesos: leer() });
  },

  guardar: (datos) => {
    const acceso: Acceso = { ...datos, id: datos.id ?? crypto.randomUUID() };
    const existe = get().accesos.some((a) => a.id === acceso.id);
    const accesos = existe ? get().accesos.map((a) => (a.id === acceso.id ? acceso : a)) : [...get().accesos, acceso];
    set({ accesos });
    escribir(accesos);
  },

  quitar: (id) => {
    const accesos = get().accesos.filter((a) => a.id !== id);
    set({ accesos });
    escribir(accesos);
  },

  restaurar: () => {
    const accesos = [...ACCESOS_PREDETERMINADOS];
    set({ accesos });
    escribir(accesos);
  },
}));
