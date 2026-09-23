import { create } from "zustand";
import { PATRON_HORA, aMinutos, type Clase } from "@/lib/horario/horario";

const CLAVE = "nexushub-horario";

function claseValida(x: unknown): Clase | null {
  if (typeof x !== "object" || x === null) return null;
  const c = x as Record<string, unknown>;
  const dia = Number(c.dia);
  if (typeof c.id !== "string" || typeof c.materia !== "string" || !c.materia.trim()) return null;
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) return null;
  if (typeof c.inicio !== "string" || !PATRON_HORA.test(c.inicio) || typeof c.fin !== "string" || !PATRON_HORA.test(c.fin)) return null;
  if (aMinutos(c.fin) <= aMinutos(c.inicio)) return null;
  return {
    id: c.id,
    materia: c.materia.trim().slice(0, 60),
    codigo: typeof c.codigo === "string" ? c.codigo.slice(0, 20) : "",
    docente: typeof c.docente === "string" ? c.docente.slice(0, 60) : "",
    aula: typeof c.aula === "string" ? c.aula.slice(0, 20) : "",
    dia,
    inicio: c.inicio,
    fin: c.fin,
    color: typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#2b7de9",
  };
}

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
