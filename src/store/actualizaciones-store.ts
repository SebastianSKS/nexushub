import { create } from "zustand";
import { esEscritorio } from "@/lib/entorno";

/**
 * Las actualizaciones de Nexo (desde el Release más reciente de GitHub, ver ACTUALIZACIONES.md).
 * Un solo estado para todo: la revisión automática al abrir, el aviso «Actualizar ahora» y la tarjeta de Configuración.
 */

export type EstadoActualizacion = "inactivo" | "buscando" | "al-dia" | "disponible" | "descargando" | "lista" | "error";

interface ActualizacionesState {
  estado: EstadoActualizacion;
  /** La versión nueva encontrada («0.1.3»). */
  version: string | null;
  /** Las notas que trae esa versión, si las trae. */
  notas: string | null;
  /** 0–100 mientras se descarga (null si no se sabe el tamaño). */
  progreso: number | null;
  /** La persona pulsó «Más tarde»: el aviso no vuelve a salir hasta la próxima vez que se abra Nexo. */
  pospuesta: boolean;
  /** Busca una versión nueva. Con `silenciosa`, si falla o no hay nada, no molesta con nada. */
  buscar: (silenciosa?: boolean) => Promise<void>;
  /** Descarga e instala la versión encontrada. */
  instalar: () => Promise<void>;
  reiniciar: () => Promise<void>;
  posponer: () => void;
}

type Actualizacion = NonNullable<Awaited<ReturnType<(typeof import("@tauri-apps/plugin-updater"))["check"]>>>;
/** El objeto de la actualización encontrada (hay que conservarlo para poder instalarla). */
let encontrada: Actualizacion | null = null;

export const useActualizacionesStore = create<ActualizacionesState>((set, get) => ({
  estado: "inactivo",
  version: null,
  notas: null,
  progreso: null,
  pospuesta: false,

  buscar: async (silenciosa = false) => {
    if (!esEscritorio()) return;
    const ahora = get().estado;
    if (ahora === "buscando" || ahora === "descargando" || ahora === "lista") return;
    if (!silenciosa) set({ estado: "buscando" });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const nueva = await check();
      if (!nueva) {
        encontrada = null;
        if (!silenciosa || ahora === "disponible") set({ estado: "al-dia", version: null, notas: null });
        return;
      }
      encontrada = nueva;
      set({ estado: "disponible", version: nueva.version, notas: nueva.body ?? null, pospuesta: get().pospuesta && get().version === nueva.version });
    } catch {
      if (!silenciosa) set({ estado: "error" }); // en silencio no se molesta a nadie: se reintenta en unas horas
    }
  },

  instalar: async () => {
    if (!encontrada) return;
    set({ estado: "descargando", progreso: 0 });
    try {
      let total = 0;
      let bajado = 0;
      await encontrada.downloadAndInstall((evento) => {
        if (evento.event === "Started") total = evento.data.contentLength ?? 0;
        else if (evento.event === "Progress") {
          bajado += evento.data.chunkLength;
          set({ progreso: total > 0 ? Math.min(100, Math.round((bajado / total) * 100)) : null });
        }
      });
      set({ estado: "lista", progreso: 100 });
    } catch {
      set({ estado: "error", progreso: null });
    }
  },

  reiniciar: async () => {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  },

  posponer: () => set({ pospuesta: true }),
}));
