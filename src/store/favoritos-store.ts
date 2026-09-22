import { create } from "zustand";
import type { Pista } from "./reproductor-store";

const CLAVE_FAVORITOS = "nexushub-musica-favoritos";
const CLAVE_RECIENTES = "nexushub-musica-recientes";
const MAX_RECIENTES = 24;

function pistaValida(x: unknown): Pista | null {
  if (typeof x !== "object" || x === null) return null;
  const p = x as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.titulo !== "string" || (p.fuente !== "youtube" && p.fuente !== "spotify")) return null;
  return {
    id: p.id,
    titulo: p.titulo,
    artista: typeof p.artista === "string" ? p.artista : "",
    caratula: typeof p.caratula === "string" ? p.caratula : "",
    duracion: typeof p.duracion === "number" ? p.duracion : 0,
    fuente: p.fuente,
  };
}

function leer(clave: string): Pista[] {
  try {
    const crudo = window.localStorage.getItem(clave);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown[];
    return Array.isArray(datos) ? datos.map(pistaValida).filter((p): p is Pista => p !== null) : [];
  } catch {
    return [];
  }
}

function guardar(clave: string, pistas: Pista[]) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(pistas));
  } catch {
    /* modo incógnito: dura solo esta sesión */
  }
}

const misma = (a: Pista, b: Pista) => a.id === b.id && a.fuente === b.fuente;

interface FavoritosState {
  cargado: boolean;
  favoritos: Pista[];
  recientes: Pista[];

  cargar: () => void;
  esFavorito: (pista: Pick<Pista, "id" | "fuente">) => boolean;
  alternarFavorito: (pista: Pista) => void;
  quitarFavorito: (pista: Pick<Pista, "id" | "fuente">) => void;
  registrarReciente: (pista: Pista) => void;
  limpiarRecientes: () => void;
}

/** Favoritos y reproducidos recientemente, guardados en este equipo: independientes de las playlists de Spotify. */
export const useFavoritosStore = create<FavoritosState>((set, get) => ({
  cargado: false,
  favoritos: [],
  recientes: [],

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, favoritos: leer(CLAVE_FAVORITOS), recientes: leer(CLAVE_RECIENTES) });
  },

  esFavorito: (pista) => get().favoritos.some((p) => p.id === pista.id && p.fuente === pista.fuente),

  alternarFavorito: (pista) => {
    const existe = get().esFavorito(pista);
    const favoritos = existe ? get().favoritos.filter((p) => !misma(p, pista)) : [pista, ...get().favoritos];
    set({ favoritos });
    guardar(CLAVE_FAVORITOS, favoritos);
  },

  quitarFavorito: (pista) => {
    const favoritos = get().favoritos.filter((p) => !(p.id === pista.id && p.fuente === pista.fuente));
    set({ favoritos });
    guardar(CLAVE_FAVORITOS, favoritos);
  },

  registrarReciente: (pista) => {
    const recientes = [pista, ...get().recientes.filter((p) => !misma(p, pista))].slice(0, MAX_RECIENTES);
    set({ recientes });
    guardar(CLAVE_RECIENTES, recientes);
  },

  limpiarRecientes: () => {
    set({ recientes: [] });
    guardar(CLAVE_RECIENTES, []);
  },
}));
