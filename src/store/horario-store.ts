import { create } from "zustand";
import type { Clase } from "@/lib/horario/horario";
import { claseValida } from "@/lib/horario/validar";

const CLAVE = "nexushub-horario";

function leer(): Clase[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return Array.isArray(lista) ? lista.map(claseValida).filter((c): c is Clase => c !== null) : [];
  } catch {
    return []; // almacenamiento bloqueado o JSON dañado
  }
}

function escribir(clases: Clase[]) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(clases));
  } catch {
    /* modo incógnito: el horario dura solo esta sesión */
  }
}

interface HorarioState {
  cargado: boolean;
  clases: Clase[];
  cargar: () => void;
  guardarClase: (c: Omit<Clase, "id"> & { id?: string }) => void;
  quitarClase: (id: string) => void;
  /** Sustituye todo el horario (por ejemplo, al escanear uno nuevo). */
  reemplazar: (clases: Omit<Clase, "id">[]) => void;
  /** Añade clases a las que ya hay, sin repetir una que coincida en materia, día y hora. */
  agregar: (clases: Omit<Clase, "id">[]) => number;
}

export const useHorarioStore = create<HorarioState>((set, get) => ({
  cargado: false,
  clases: [],

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, clases: leer() });
  },

  guardarClase: (datos) => {
    const clase: Clase = { ...datos, id: datos.id ?? crypto.randomUUID() };
    const existe = get().clases.some((c) => c.id === clase.id);
    const clases = existe ? get().clases.map((c) => (c.id === clase.id ? clase : c)) : [...get().clases, clase];
    set({ clases });
    escribir(clases);
  },

  quitarClase: (id) => {
    const clases = get().clases.filter((c) => c.id !== id);
    set({ clases });
    escribir(clases);
  },

  reemplazar: (nuevas) => {
    const clases = nuevas.map((c) => ({ ...c, id: crypto.randomUUID() }));
    set({ clases });
    escribir(clases);
  },

  agregar: (nuevas) => {
    const actuales = get().clases;
    const utiles = nuevas.filter((n) => !actuales.some((c) => c.dia === n.dia && c.inicio === n.inicio && c.materia === n.materia));
    const clases = [...actuales, ...utiles.map((c) => ({ ...c, id: crypto.randomUUID() }))];
    set({ clases });
    escribir(clases);
    return utiles.length;
  },
}));
