import { create } from "zustand";

export interface Nota {
  id: string;
  texto: string;
  hecha: boolean;
}

const CLAVE_NOTAS = "nexushub-notas";

function leer(): Nota[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE_NOTAS);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown[];
    if (!Array.isArray(datos)) return [];
    return datos
      .map((x): Nota | null => {
        if (typeof x !== "object" || x === null) return null;
        const n = x as Record<string, unknown>;
        if (typeof n.id !== "string" || typeof n.texto !== "string" || !n.texto.trim()) return null;
        return { id: n.id, texto: n.texto.slice(0, 200), hecha: n.hecha === true };
      })
      .filter((n): n is Nota => n !== null);
  } catch {
    return []; // almacenamiento bloqueado o JSON dañado
  }
}

function guardar(notas: Nota[]) {
  try {
    window.localStorage.setItem(CLAVE_NOTAS, JSON.stringify(notas));
  } catch {
    /* modo incógnito: duran solo esta sesión */
  }
}

interface NotasState {
  cargado: boolean;
  notas: Nota[];
  cargar: () => void;
  agregar: (texto: string) => void;
  alternar: (id: string) => void;
  quitar: (id: string) => void;
  reordenar: (notas: Nota[]) => void;
}

/** Lista de pendientes corta, junto al calendario: sin fecha ni recordatorio, solo tachar cuando esté hecho. */
export const useNotasStore = create<NotasState>((set, get) => ({
  cargado: false,
  notas: [],

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, notas: leer() });
  },

  agregar: (texto) => {
    const limpio = texto.trim().slice(0, 200);
    if (!limpio) return;
    const notas = [...get().notas, { id: crypto.randomUUID(), texto: limpio, hecha: false }];
    set({ notas });
    guardar(notas);
  },

  alternar: (id) => {
    const notas = get().notas.map((n) => (n.id === id ? { ...n, hecha: !n.hecha } : n));
    set({ notas });
    guardar(notas);
  },

  quitar: (id) => {
    const notas = get().notas.filter((n) => n.id !== id);
    set({ notas });
    guardar(notas);
  },

  reordenar: (notas) => {
    set({ notas });
    guardar(notas);
  },
}));
