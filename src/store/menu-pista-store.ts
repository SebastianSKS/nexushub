import { create } from "zustand";
import type { Pista } from "./reproductor-store";

/** Qué canción tiene abierto el menú «…» (uno solo para toda la aplicación) y el diálogo «Añadir a una playlist». */
interface MenuPistaState {
  menu: { x: number; y: number; pista: Pista; artistId?: string; albumId?: string } | null;
  playlistDe: Pista | null;
  abrir: (x: number, y: number, pista: Pista, ids?: { artistId?: string; albumId?: string }) => void;
  cerrar: () => void;
  abrirPlaylists: (pista: Pista) => void;
  cerrarPlaylists: () => void;
}

export const useMenuPistaStore = create<MenuPistaState>((set) => ({
  menu: null,
  playlistDe: null,
  abrir: (x, y, pista, ids) => set({ menu: { x, y, pista, ...ids } }),
  cerrar: () => set({ menu: null }),
  abrirPlaylists: (pista) => set({ menu: null, playlistDe: pista }),
  cerrarPlaylists: () => set({ playlistDe: null }),
}));

/** Abre el menú de una canción junto al puntero (clic derecho) o junto al botón «…» que se pulsó. */
export function abrirMenuPista(e: { clientX: number; clientY: number; currentTarget: EventTarget; preventDefault: () => void; type: string }, pista: Pista, ids?: { artistId?: string; albumId?: string }) {
  e.preventDefault();
  let x = e.clientX;
  let y = e.clientY;
  if (e.type === "click") {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    x = r.left;
    y = r.bottom + 4;
  }
  useMenuPistaStore.getState().abrir(x, y, pista, ids);
}
