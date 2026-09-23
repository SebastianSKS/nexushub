import { create } from "zustand";

const CLAVE_PROGRESO = "nexushub-progreso-video";
const CLAVE_VELOCIDAD = "nexushub-velocidad-video";
const MAXIMO = 300;
/** Menos de esto no cuenta como «vi una parte»: es más probable que se abriera por error. */
const MINIMO_SEG = 10;
/** Si quedan menos de estos segundos, el video se da por visto y empieza de cero la próxima vez. */
const RESTANTE_FIN_SEG = 15;

export const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export interface EntradaProgreso {
  /** Segundo en el que se quedó. */
  t: number;
  /** Duración total. */
  d: number;
  /** Cuándo se guardó (ms), para olvidar lo más viejo. */
  at: number;
}

function leerProgreso(): Record<string, EntradaProgreso> {
  try {
    const crudo = JSON.parse(window.localStorage.getItem(CLAVE_PROGRESO) ?? "{}") as Record<string, Partial<EntradaProgreso>>;
    const limpio: Record<string, EntradaProgreso> = {};
    for (const [id, e] of Object.entries(crudo)) {
      if (/^[\w-]{11}$/.test(id) && typeof e.t === "number" && typeof e.d === "number" && e.d > 0 && e.t >= 0) limpio[id] = { t: e.t, d: e.d, at: typeof e.at === "number" ? e.at : 0 };
    }
    return limpio;
  } catch {
    return {}; // almacenamiento bloqueado o JSON dañado
  }
}

function leerVelocidad(): number {
  try {
    const v = Number(window.localStorage.getItem(CLAVE_VELOCIDAD));
    return VELOCIDADES.includes(v as (typeof VELOCIDADES)[number]) ? v : 1;
  } catch {
    return 1;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo incógnito: dura solo esta sesión */
  }
}

interface ProgresoVideoState {
  cargado: boolean;
  progreso: Record<string, EntradaProgreso>;
  velocidad: number;
  cargar: () => void;
  /** Guarda en qué segundo va un video (o lo olvida si está casi terminado o apenas empezó). */
  guardar: (id: string, segundos: number, duracion: number) => void;
  olvidar: (id: string) => void;
  /** Segundo desde el que hay que retomar un video (0 = desde el principio). */
  inicioDe: (id: string) => number;
  setVelocidad: (v: number) => void;
}

export const useProgresoVideoStore = create<ProgresoVideoState>((set, get) => ({
  cargado: false,
  progreso: {},
  velocidad: 1,

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, progreso: leerProgreso(), velocidad: leerVelocidad() });
  },

  guardar: (id, segundos, duracion) => {
    if (!(duracion > 0) || !Number.isFinite(segundos)) return;
    if (segundos < MINIMO_SEG || segundos > duracion - RESTANTE_FIN_SEG) return get().olvidar(id);
    const previo = get().progreso[id];
    if (previo && Math.abs(previo.t - segundos) < 1) return;
    let progreso = { ...get().progreso, [id]: { t: Math.floor(segundos), d: Math.round(duracion), at: Date.now() } };
    const ids = Object.keys(progreso);
    if (ids.length > MAXIMO) {
      const sobra = ids.sort((a, b) => progreso[a]!.at - progreso[b]!.at).slice(0, ids.length - MAXIMO);
      progreso = Object.fromEntries(Object.entries(progreso).filter(([k]) => !sobra.includes(k)));
    }
    set({ progreso });
    escribir(CLAVE_PROGRESO, progreso);
  },

  olvidar: (id) => {
    if (!(id in get().progreso)) return;
    const { [id]: _quitado, ...resto } = get().progreso;
    set({ progreso: resto });
    escribir(CLAVE_PROGRESO, resto);
  },

  inicioDe: (id) => {
    get().cargar();
    const e = get().progreso[id];
    return e && e.t >= MINIMO_SEG && e.t <= e.d - RESTANTE_FIN_SEG ? e.t : 0;
  },

  setVelocidad: (v) => {
    if (get().velocidad === v) return;
    set({ velocidad: v });
    escribir(CLAVE_VELOCIDAD, v);
  },
}));
