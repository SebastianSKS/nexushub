import { create } from "zustand";
import type { GuiaId } from "@/lib/guias";

/** La marca de «ya vio la bienvenida» de antes de que hubiera guías por sección: se respeta para no repetirla a nadie. */
export const CLAVE_TOUR_VISTO = "nexushub-tour-visto";
/** Las guías que ya se mostraron (o se cerraron) en este equipo. Empieza con «nexushub-»: entra en la copia de respaldo. */
const CLAVE_VISTAS = "nexushub-guias-vistas";

function leerVistas(): GuiaId[] {
  const vistas: GuiaId[] = [];
  try {
    const lista = JSON.parse(window.localStorage.getItem(CLAVE_VISTAS) ?? "[]") as unknown;
    if (Array.isArray(lista)) vistas.push(...(lista.filter((x) => typeof x === "string") as GuiaId[]));
    if (window.localStorage.getItem(CLAVE_TOUR_VISTO) === "1" && !vistas.includes("bienvenida")) vistas.push("bienvenida");
  } catch {
    /* almacenamiento bloqueado o dañado: se empieza sin guías vistas */
  }
  return vistas;
}

interface GuiasState {
  /** Ya se leyó lo guardado (hasta entonces no se muestra nada solo). */
  cargado: boolean;
  vistas: GuiaId[];
  /** La guía que está a la vista ahora, si hay una. */
  abierta: GuiaId | null;
  cargar: () => void;
  /** Muestra una guía (sola la primera vez, o cuando la persona pulsa «?»). */
  abrir: (id: GuiaId) => void;
  /** La cierra y la da por vista. */
  cerrar: () => void;
}

export const useGuiasStore = create<GuiasState>((set, get) => ({
  cargado: false,
  vistas: [],
  abierta: null,

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, vistas: leerVistas() });
  },

  abrir: (id) => set({ abierta: id }),

  cerrar: () => {
    const id = get().abierta;
    if (!id) return;
    const vistas = get().vistas.includes(id) ? get().vistas : [...get().vistas, id];
    set({ abierta: null, vistas });
    try {
      window.localStorage.setItem(CLAVE_VISTAS, JSON.stringify(vistas));
      if (id === "bienvenida") window.localStorage.setItem(CLAVE_TOUR_VISTO, "1");
    } catch {
      /* sin almacenamiento: se volverá a mostrar la próxima vez, sin mayor problema */
    }
  },
}));
