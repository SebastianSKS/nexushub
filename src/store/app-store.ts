import { create } from "zustand";
import type { NowPlaying, StatusOperation } from "@/types";

/**
 * Estado de la interfaz que NO es navegación: qué sección se ve lo decide la URL.
 * (Antes vivía aquí `activeModule`, y por eso el botón atrás no sabía a dónde ir.)
 */
interface AppState {
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  /** Vista grande "reproduciendo ahora", a pantalla completa sobre el contenido. */
  reproductorGrandeAbierto: boolean;
  /** Panel «Cola de reproducción» de la música. */
  colaMusicaAbierta: boolean;
  /** Recorrido de bienvenida (la primera vez que se abre, o "Ver de nuevo" desde Configuración). */
  tourAbierto: boolean;

  operation: StatusOperation | null;
  nowPlaying: NowPlaying | null;
  filesProcessed: number;

  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setReproductorGrandeAbierto: (v: boolean) => void;
  setColaMusicaAbierta: (v: boolean) => void;
  setTourAbierto: (v: boolean) => void;

  setOperation: (op: StatusOperation | null) => void;
  setNowPlaying: (np: NowPlaying | null) => void;
  addFilesProcessed: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  searchOpen: false,
  reproductorGrandeAbierto: false,
  colaMusicaAbierta: false,
  tourAbierto: false,

  operation: null,
  nowPlaying: null,
  filesProcessed: 0,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setReproductorGrandeAbierto: (reproductorGrandeAbierto) => set({ reproductorGrandeAbierto }),
  setColaMusicaAbierta: (colaMusicaAbierta) => set({ colaMusicaAbierta }),
  setTourAbierto: (tourAbierto) => set({ tourAbierto }),

  setOperation: (operation) => set({ operation }),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
  addFilesProcessed: (n) => set((s) => ({ filesProcessed: s.filesProcessed + n })),
}));
