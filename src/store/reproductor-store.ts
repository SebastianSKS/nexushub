import { create } from "zustand";
import { controlador, todosLosControladores } from "@/services/reproductor/controladores";

export type Fuente = "youtube" | "spotify";
export type ModoRepetir = "no" | "una" | "todas";

export interface Pista {
  /** YouTube: el videoId. Spotify: «tipo:id» (p. ej. track:4cOdK2…). */
  id: string;
  titulo: string;
  artista: string;
  caratula: string;
  /** Segundos; 0 = aún no se conoce. */
  duracion: number;
  fuente: Fuente;
  /** Spotify: el artista principal, si se conoce (para «Ir al artista»). */
  artistId?: string;
}

/** Qué controles puede cumplir la fuente activa. La barra oculta los demás en vez de fingirlos. */
export interface Capacidades {
  buscar: boolean;
  saltar: boolean;
  volumen: boolean;
  aleatorio: boolean;
  repetir: boolean;
}

const SIN_CAPACIDADES: Capacidades = { buscar: false, saltar: false, volumen: false, aleatorio: false, repetir: false };

/**
 * Lo que cada fuente PUEDE hacer. YouTube: todo (la cola, el aleatorio y el repetir los maneja Nexo).
 * Spotify en Modo Invitado (embed oficial): reproducir/pausar y mover la barra; el embed no expone volumen,
 * pero la cola (siguiente, aleatorio, repetir) la maneja Nexo. El Modo Conectado (SDK) lo amplía al conectarse.
 */
const CAPACIDADES_POR_FUENTE: Record<"youtube" | "spotify", Capacidades> = {
  youtube: { buscar: true, saltar: true, volumen: true, aleatorio: true, repetir: true },
  // En Invitado la cola la maneja Nexo (el embed solo toca una canción): aleatorio y repetir sí se pueden.
  spotify: { buscar: true, saltar: false, volumen: false, aleatorio: true, repetir: true },
};

/**
 * UN solo store para audio y video, accesible desde cualquier ruta. Las dos fuentes son
 * mutuamente excluyentes: al iniciar una, la otra se pausa. Nunca dos audios a la vez.
 */
interface ReproductorState {
  fuente: Fuente | null;
  reproduciendo: boolean;
  pista: Pista | null;
  /** Segundos transcurridos en el instante `progresoMarca`. */
  progreso: number;
  progresoMarca: number;
  volumen: number;
  aleatorio: boolean;
  repetir: ModoRepetir;
  cola: Pista[];
  indiceActual: number;
  /** Temporizador para dormir: pausa en un momento dado, o al terminar la canción que suena. */
  dormir: { modo: "tiempo"; hasta: number } | { modo: "cancion" } | null;

  capacidades: Capacidades;
  error: string | null;
  /** Se incrementa en cada petición de reproducir, aunque sea la misma pista (para reiniciarla). */
  solicitud: number;
  /** ¿La última petición debe empezar a sonar de inmediato? (false al abrir un enlace directo con «reproducción automática» apagada). */
  autoplay: boolean;

  /** Video: el contenedor fijo está en modo miniatura y el usuario lo cerró. */
  miniCerrada: boolean;

  reproducir: (pista: Pista, cola?: Pista[], indice?: number, opciones?: { reproducir?: boolean }) => void;
  encolar: (pista: Pista) => void;
  /** Añade pistas al final de la cola (continuación automática). */
  extenderCola: (pistas: Pista[]) => void;
  /** Lo llama el adaptador cuando Spotify pasa solo a otra canción (la que se le dejó lista): la interfaz la sigue sin volver a pedir nada. */
  avanzarA: (pista: Pista, indice: number) => void;
  /** Pone una canción justo después de la que suena (la que Spotify ya tiene lista como siguiente). */
  insertarDespues: (pista: Pista) => void;
  programarDormir: (d: ReproductorState["dormir"]) => void;
  quitarDeCola: (indice: number) => void;
  reordenarCola: (cola: Pista[]) => void;
  irAIndice: (indice: number) => void;
  alternar: () => void;
  pausar: () => void;
  siguiente: (automatico?: boolean) => void;
  anterior: () => void;
  buscar: (segundos: number) => void;
  setVolumen: (v: number) => void;
  setAleatorio: (a: boolean) => void;
  setRepetir: (m: ModoRepetir) => void;
  cerrar: () => void;
  reabrirMini: () => void;

  /** Lo llaman los adaptadores para reflejar el estado real del reproductor. */
  informar: (parcial: Partial<Pick<ReproductorState, "reproduciendo" | "progreso" | "error" | "capacidades">> & { duracion?: number; pista?: Pista }) => void;
}

export const useReproductorStore = create<ReproductorState>((set, get) => ({
  fuente: null,
  reproduciendo: false,
  pista: null,
  progreso: 0,
  progresoMarca: 0,
  volumen: 70,
  aleatorio: false,
  repetir: "no",
  cola: [],
  indiceActual: -1,
  dormir: null,

  capacidades: SIN_CAPACIDADES,
  error: null,
  solicitud: 0,
  autoplay: true,
  miniCerrada: false,

  reproducir: (pista, cola, indice, opciones) => {
    const s = get();
    // Exclusión mutua: si cambia la fuente, se pausa la otra ANTES de arrancar esta.
    if (s.fuente && s.fuente !== pista.fuente) controlador(s.fuente)?.pausar();
    const lista = cola && cola.length > 0 ? cola : [pista];
    const i = indice ?? Math.max(0, lista.findIndex((p) => p.id === pista.id && p.fuente === pista.fuente));
    set({
      fuente: pista.fuente,
      pista,
      cola: lista,
      indiceActual: i,
      reproduciendo: false,
      progreso: 0,
      progresoMarca: Date.now(),
      error: null,
      solicitud: s.solicitud + 1,
      autoplay: opciones?.reproducir !== false,
      miniCerrada: false,
      // Al cambiar de fuente las capacidades vuelven a las de esa fuente (el SDK de Spotify las amplía luego).
      capacidades: s.fuente === pista.fuente ? s.capacidades : CAPACIDADES_POR_FUENTE[pista.fuente],
    });
  },

  encolar: (pista) => {
    const s = get();
    if (!s.pista) {
      get().reproducir(pista);
      return;
    }
    if (s.cola.some((p) => p.id === pista.id && p.fuente === pista.fuente)) return;
    set({ cola: [...s.cola, pista] });
  },

  programarDormir: (dormir) => set({ dormir }),

  avanzarA: (pista, indice) => {
    const s = get();
    set({ pista, indiceActual: indice, cola: s.cola.map((c, i) => (i === indice ? pista : c)), progreso: 0, progresoMarca: Date.now(), error: null });
  },

  insertarDespues: (pista) => {
    const s = get();
    const cola = [...s.cola];
    cola.splice(s.indiceActual + 1, 0, pista);
    set({ cola });
  },

  extenderCola: (pistas) => {
    const s = get();
    if (pistas.length === 0) return;
    set({ cola: [...s.cola, ...pistas] });
  },

  quitarDeCola: (indice) => {
    const s = get();
    if (indice === s.indiceActual || indice < 0 || indice >= s.cola.length) return; // la que suena no se quita
    const cola = s.cola.filter((_, i) => i !== indice);
    set({ cola, indiceActual: indice < s.indiceActual ? s.indiceActual - 1 : s.indiceActual });
  },

  reordenarCola: (cola) => {
    const s = get();
    const actual = s.pista;
    const indice = actual ? cola.findIndex((p) => p.id === actual.id && p.fuente === actual.fuente) : -1;
    set({ cola, indiceActual: indice });
  },

  irAIndice: (indice) => {
    const s = get();
    const p = s.cola[indice];
    if (p) get().reproducir(p, s.cola, indice);
  },

  alternar: () => {
    const s = get();
    if (!s.pista || !s.fuente) return;
    const c = controlador(s.fuente);
    if (s.reproduciendo) c?.pausar();
    else c?.reanudar();
  },

  pausar: () => {
    const s = get();
    if (s.fuente && s.reproduciendo) controlador(s.fuente)?.pausar();
  },

  /**
   * Siguiente pista. `automatico` = terminó sola: respeta «repetir una». Con aleatorio elige al azar
   * otra pista de la cola; «repetir todas» da la vuelta al llegar al final.
   */
  siguiente: (automatico = false) => {
    const s = get();
    if (!s.pista) return;
    const c = controlador(s.fuente);
    // Un álbum, playlist o artista dado como «contexto» lo recorre Spotify mismo: se le delega. Las canciones sueltas y las
    // colas (lo normal) las maneja Nexo, igual en Invitado que en Conectado.
    if (!automatico && c?.siguiente && s.fuente === "spotify" && s.capacidades.saltar && !s.pista.id.startsWith("track:")) {
      c.siguiente();
      return;
    }
    // Si Spotify ya tiene lista la siguiente canción, se pasa a ella al instante (sin la espera de cargarla de cero).
    if (!automatico && c?.avanzarPrecargada?.()) return;
    if (automatico && s.repetir === "una") {
      get().reproducir(s.pista, s.cola, s.indiceActual);
      return;
    }
    if (s.cola.length <= 1 && !(automatico && s.repetir === "todas")) {
      if (automatico) set({ reproduciendo: false });
      return;
    }
    let siguiente = s.indiceActual + 1;
    if (s.aleatorio && s.cola.length > 1) {
      do siguiente = Math.floor(Math.random() * s.cola.length);
      while (siguiente === s.indiceActual);
    } else if (siguiente >= s.cola.length) {
      if (s.repetir === "todas") siguiente = 0;
      else {
        if (automatico) set({ reproduciendo: false });
        return;
      }
    }
    get().irAIndice(siguiente);
  },

  /** Anterior: si ya pasaron más de 3 s, reinicia la pista; si no, va a la anterior. */
  anterior: () => {
    const s = get();
    if (!s.pista) return;
    const c = controlador(s.fuente);
    if (c?.anterior && s.fuente === "spotify" && s.capacidades.saltar && !s.pista.id.startsWith("track:")) {
      c.anterior();
      return;
    }
    const transcurrido = s.progreso + (s.reproduciendo ? (Date.now() - s.progresoMarca) / 1000 : 0);
    if (transcurrido > 3 || s.indiceActual <= 0) {
      if (controlador(s.fuente)?.buscar) get().buscar(0);
      else get().reproducir(s.pista, s.cola, s.indiceActual);
      return;
    }
    get().irAIndice(s.indiceActual - 1);
  },

  buscar: (segundos) => {
    const s = get();
    controlador(s.fuente)?.buscar?.(segundos);
    set({ progreso: segundos, progresoMarca: Date.now() });
  },

  setVolumen: (volumen) => {
    set({ volumen });
    for (const [, c] of todosLosControladores()) c.volumen?.(volumen);
  },

  setAleatorio: (aleatorio) => {
    set({ aleatorio });
    controlador(get().fuente)?.aleatorio?.(aleatorio);
  },

  setRepetir: (repetir) => {
    set({ repetir });
    controlador(get().fuente)?.repetir?.(repetir);
  },

  /** Detiene todo y quita la pista actual (botón cerrar de la miniatura o de la barra). */
  cerrar: () => {
    const s = get();
    if (s.fuente) controlador(s.fuente)?.pausar();
    set({ fuente: null, pista: null, cola: [], indiceActual: -1, reproduciendo: false, progreso: 0, error: null, capacidades: SIN_CAPACIDADES });
  },

  reabrirMini: () => set({ miniCerrada: false }),

  informar: (p) =>
    set((s) => {
      const siguiente: Partial<ReproductorState> = {};
      if (p.reproduciendo !== undefined) siguiente.reproduciendo = p.reproduciendo;
      if (p.progreso !== undefined) {
        siguiente.progreso = p.progreso;
        siguiente.progresoMarca = Date.now();
      }
      if (p.error !== undefined) siguiente.error = p.error;
      if (p.capacidades) siguiente.capacidades = p.capacidades;
      if (p.pista) {
        siguiente.pista = p.pista;
        // El adaptador puede afinar la pista actual (p. ej. la duración real o la que eligió Spotify).
        siguiente.cola = s.cola.map((c, i) => (i === s.indiceActual ? p.pista! : c));
      }
      if (p.duracion !== undefined && s.pista && s.pista.duracion !== p.duracion) {
        const pista = { ...s.pista, duracion: p.duracion };
        siguiente.pista = pista;
        siguiente.cola = s.cola.map((c, i) => (i === s.indiceActual ? pista : c));
      }
      return siguiente;
    }),
}));

/** Segundos actuales, interpolando desde la última actualización mientras suena. */
export function progresoActual(s: Pick<ReproductorState, "progreso" | "progresoMarca" | "reproduciendo" | "pista">): number {
  const extra = s.reproduciendo ? (Date.now() - s.progresoMarca) / 1000 : 0;
  const total = s.pista?.duracion ?? 0;
  const v = s.progreso + extra;
  return total > 0 ? Math.min(v, total) : v;
}
