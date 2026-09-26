import { create } from "zustand";
import { traducir } from "@/lib/i18n";
import {
  guardarCanales,
  guardarDuraciones,
  interpretarImportacion,
  leerCanales,
  leerDuraciones,
  serializarExportacion,
} from "@/lib/canales/almacen";
import { CANALES_SUGERIDOS } from "@/lib/canales/sugeridos";
import { ErrorApi, resolverEntrada, traerVideos, verificarIncrustacion } from "@/services/canales/api";
import type { Canal, MotivoNoIncrustable, VideoCanal } from "@/types/canal";

export interface ErrorFeed {
  mensaje: string;
  pista?: string;
  codigo?: string;
}

export interface EstadoFeed {
  estado: "cargando" | "listo" | "error";
  videos: VideoCanal[];
  error?: ErrorFeed;
}

export interface Incrustacion {
  incrustable: boolean;
  motivo?: MotivoNoIncrustable;
}

/** Interruptores del panel de desarrollo (?dev=1). Sin el panel siempre valen false. */
export interface BanderasDev {
  feedVacio: boolean;
  timeoutRed: boolean;
}

interface CanalesState {
  iniciado: boolean;
  canales: Canal[];
  feeds: Record<string, EstadoFeed>;
  verificacion: Record<string, Incrustacion>;
  duraciones: Record<string, number>;

  busqueda: string;

  dev: BanderasDev;

  iniciar: () => void;
  cargarFeed: (id: string, opts?: { fresco?: boolean }) => Promise<void>;
  cargarTodos: (opts?: { fresco?: boolean }) => Promise<void>;
  agregarCanal: (entrada: string) => Promise<{ ok: true; canal: Canal } | { ok: false; error: ErrorFeed }>;
  quitarCanal: (id: string) => void;
  conservarSugerido: (id: string) => void;
  moverCanal: (id: string, delta: -1 | 1) => void;
  reordenarCanales: (canales: Canal[]) => void;
  restaurarSugeridos: () => void;
  exportarCanales: () => string;
  importarCanales: (texto: string) => { ok: true; agregados: number; repetidos: number; invalidos: number } | { ok: false; error: string };

  setBusqueda: (q: string) => void;
  guardarDuracion: (videoId: string, segundos: number) => void;
  marcarNoIncrustable: (videoId: string, motivo: MotivoNoIncrustable) => void;

  setDev: (b: Partial<BanderasDev>) => void;
  vaciarCache: () => Promise<void>;
}

const CONCURRENCIA_FEEDS = 3;

const ahora = () => new Date().toISOString();

const sugeridos = (): Canal[] => CANALES_SUGERIDOS.map((c) => ({ ...c, agregadoEn: ahora(), sugerido: true }));

/** Ejecuta `tarea` sobre cada elemento con como máximo `n` a la vez. */
async function conConcurrencia<T>(items: T[], n: number, tarea: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await tarea(items[i++]!);
    }),
  );
}

const aError = (err: unknown): ErrorFeed =>
  err instanceof ErrorApi
    ? { mensaje: err.message, pista: err.pista, codigo: err.codigo }
    : { mensaje: traducir("Ocurrió un error inesperado."), pista: traducir("Inténtalo de nuevo en unos segundos.") };

export const useCanalesStore = create<CanalesState>((set, get) => {
  const persistir = (canales: Canal[]) => {
    guardarCanales(canales); // si el almacenamiento falla, sigue en memoria
  };

  /** Verifica en el servidor los videos cuya incrustación aún no se conoce. */
  const verificarNuevos = async (videos: VideoCanal[], fresco = false) => {
    const { verificacion } = get();
    const ids = videos.map((v) => v.videoId).filter((id) => fresco || !(id in verificacion));
    if (ids.length === 0) return;
    try {
      const res = await verificarIncrustacion([...new Set(ids)], fresco);
      set((s) => {
        const siguiente = { ...s.verificacion };
        for (const r of res) siguiente[r.videoId] = { incrustable: r.incrustable, motivo: r.motivo };
        return { verificacion: siguiente };
      });
    } catch {
      /* Si la verificación falla no se oculta nada: se asume incrustable. */
    }
  };

  return {
    iniciado: false,
    canales: [],
    feeds: {},
    verificacion: {},
    duraciones: {},

    busqueda: "",

    dev: { feedVacio: false, timeoutRed: false },

    iniciar: () => {
      if (get().iniciado) return;
      const guardados = leerCanales();
      // Sin canales guardados (o lista vacía) la app nunca abre vacía: se precargan las sugerencias.
      const canales = guardados && guardados.length > 0 ? guardados : sugeridos();
      set({ iniciado: true, canales, duraciones: leerDuraciones() });
      if (!guardados || guardados.length === 0) persistir(canales);
      void get().cargarTodos();
    },

    cargarFeed: async (id, opts = {}) => {
      const canal = get().canales.find((c) => c.id === id);
      if (!canal) return;
      const previo = get().feeds[id];
      set((s) => ({ feeds: { ...s.feeds, [id]: { estado: "cargando", videos: previo?.videos ?? [] } } }));

      try {
        const { dev } = get();
        if (dev.timeoutRed) {
          // Simula lo que ocurre cuando YouTube no responde a tiempo.
          await new Promise((r) => setTimeout(r, 1200));
          throw new ErrorApi(traducir("YouTube tardó demasiado en responder."), traducir("Comprueba tu conexión a internet e inténtalo de nuevo."), "TIMEOUT");
        }
        const videos = dev.feedVacio ? [] : (await traerVideos(id, canal.tipo, opts.fresco)).videos;
        set((s) => ({ feeds: { ...s.feeds, [id]: { estado: "listo", videos } } }));
        void verificarNuevos(videos, false);
      } catch (err) {
        // Se conservan los videos anteriores: un fallo de red no debe vaciar el muro.
        set((s) => ({ feeds: { ...s.feeds, [id]: { estado: "error", videos: previo?.videos ?? [], error: aError(err) } } }));
      }
    },

    cargarTodos: async (opts = {}) => {
      await conConcurrencia(get().canales, CONCURRENCIA_FEEDS, (c) => get().cargarFeed(c.id, opts));
    },

    agregarCanal: async (entrada) => {
      try {
        const r = await resolverEntrada(entrada);
        if (get().canales.some((c) => c.id === r.id)) {
          return { ok: false, error: { mensaje: traducir("Ya sigues a «{nombre}».", { nombre: r.nombre }), pista: traducir("Está en la lista de la izquierda.") } };
        }
        if (get().canales.length >= 40) {
          return { ok: false, error: { mensaje: traducir("Llegaste al máximo de 40 canales."), pista: traducir("Quita alguno para poder agregar otro.") } };
        }
        const canal: Canal = { id: r.id, nombre: r.nombre, avatar: r.avatar, tipo: r.tipo, agregadoEn: ahora() };
        const canales = [...get().canales, canal];
        set({ canales });
        persistir(canales);
        void get().cargarFeed(canal.id);
        return { ok: true, canal };
      } catch (err) {
        return { ok: false, error: aError(err) };
      }
    },

    quitarCanal: (id) => {
      const canales = get().canales.filter((c) => c.id !== id);
      const { [id]: _quitado, ...feeds } = get().feeds;
      set({ canales, feeds });
      persistir(canales);
    },

    conservarSugerido: (id) => {
      const canales = get().canales.map((c) => (c.id === id ? { ...c, sugerido: undefined } : c));
      set({ canales });
      persistir(canales);
    },

    moverCanal: (id, delta) => {
      const canales = [...get().canales];
      const i = canales.findIndex((c) => c.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= canales.length) return;
      [canales[i], canales[j]] = [canales[j]!, canales[i]!];
      set({ canales });
      persistir(canales);
    },

    reordenarCanales: (canales) => {
      set({ canales });
      persistir(canales);
    },

    restaurarSugeridos: () => {
      const canales = sugeridos();
      set({ canales });
      persistir(canales);
      void get().cargarTodos();
    },

    exportarCanales: () => serializarExportacion(get().canales.map(({ sugerido: _s, ...c }) => c)),

    importarCanales: (texto) => {
      const r = interpretarImportacion(texto);
      if ("error" in r) return { ok: false, error: r.error };
      // Los canales sugeridos que nadie eligió no cuentan como "ya seguidos": si vienen en el archivo, se
      // vuelven canales del usuario; los demás sugeridos se retiran para dejar la lista tal como la repartió el maestro.
      const base = get().canales.filter((c) => !c.sugerido);
      const existentes = new Set(base.map((c) => c.id));
      const nuevos = r.canales.filter((c) => !existentes.has(c.id));
      const aAgregar = nuevos.slice(0, Math.max(40 - base.length, 0));
      const canales = [...base, ...aAgregar];
      set({ canales });
      persistir(canales);
      void get().cargarTodos();
      return {
        ok: true,
        agregados: aAgregar.length,
        repetidos: r.canales.length - nuevos.length + (nuevos.length - aAgregar.length),
        invalidos: r.invalidos,
      };
    },

    setBusqueda: (busqueda) => set({ busqueda }),

    guardarDuracion: (videoId, segundos) => {
      const s = Math.round(segundos);
      if (!(s > 0) || get().duraciones[videoId] === s) return;
      const duraciones = { ...get().duraciones, [videoId]: s };
      set({ duraciones });
      guardarDuraciones(duraciones);
    },

    marcarNoIncrustable: (videoId, motivo) =>
      set((s) => ({ verificacion: { ...s.verificacion, [videoId]: { incrustable: false, motivo } } })),

    setDev: (b) => set((s) => ({ dev: { ...s.dev, ...b } })),

    vaciarCache: async () => {
      set({ verificacion: {} });
      await get().cargarTodos({ fresco: true });
      const todos = Object.values(get().feeds).flatMap((f) => f.videos);
      await verificarNuevos(todos, true);
    },
  };
});

/** Estado efectivo de incrustación: lo verificado, o lo que asumía el feed (siempre optimista). */
export function estaIncrustable(video: VideoCanal, verificacion: Record<string, Incrustacion>): Incrustacion {
  return verificacion[video.videoId] ?? { incrustable: video.incrustable };
}
