import { create } from "zustand";

/**
 * Repaso: tarjetas de estudio (flashcards) con repetición espaciada, todo en el equipo (localStorage).
 * El algoritmo es una versión simplificada de SM-2: cada tarjeta guarda su facilidad, su intervalo en días
 * y cuándo vuelve a tocar (vence). Al estudiar, se califica «otra vez / bien / fácil» y la tarjeta se reprograma.
 */

export interface Mazo {
  id: string;
  nombre: string;
  /** Materia opcional (texto libre) para agrupar. */
  materia: string;
  creado: number;
}

export interface Tarjeta {
  id: string;
  mazoId: string;
  frente: string;
  reverso: string;
  /** Facilidad (SM-2): 1.3 a ~3. Baja cuando cuesta, sube cuando es fácil. */
  facilidad: number;
  /** Intervalo actual en días. */
  intervalo: number;
  /** Repasos seguidos acertados. */
  repeticiones: number;
  /** Cuándo vuelve a tocar (ms). 0 = nunca repasada, toca ya. */
  vence: number;
  creada: number;
}

export type Calificacion = "otra" | "bien" | "facil";

const CLAVE = "nexushub-repaso";
const DIA = 24 * 60 * 60 * 1000;
const FACILIDAD_INICIAL = 2.5;
const FACILIDAD_MIN = 1.3;

interface Guardado {
  mazos: Mazo[];
  tarjetas: Tarjeta[];
}

function leer(): Guardado {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { mazos: [], tarjetas: [] };
    const d = JSON.parse(crudo) as { mazos?: unknown; tarjetas?: unknown };
    const mazos = Array.isArray(d.mazos)
      ? d.mazos
          .map((m): Mazo | null => {
            if (typeof m !== "object" || m === null) return null;
            const x = m as Record<string, unknown>;
            if (typeof x.id !== "string" || typeof x.nombre !== "string") return null;
            return { id: x.id, nombre: x.nombre.slice(0, 80), materia: typeof x.materia === "string" ? x.materia.slice(0, 60) : "", creado: typeof x.creado === "number" ? x.creado : Date.now() };
          })
          .filter((m): m is Mazo => m !== null)
      : [];
    const tarjetas = Array.isArray(d.tarjetas)
      ? d.tarjetas
          .map((c): Tarjeta | null => {
            if (typeof c !== "object" || c === null) return null;
            const x = c as Record<string, unknown>;
            if (typeof x.id !== "string" || typeof x.mazoId !== "string") return null;
            if (typeof x.frente !== "string" || typeof x.reverso !== "string") return null;
            return {
              id: x.id,
              mazoId: x.mazoId,
              frente: x.frente.slice(0, 500),
              reverso: x.reverso.slice(0, 1000),
              facilidad: typeof x.facilidad === "number" ? x.facilidad : FACILIDAD_INICIAL,
              intervalo: typeof x.intervalo === "number" ? x.intervalo : 0,
              repeticiones: typeof x.repeticiones === "number" ? x.repeticiones : 0,
              vence: typeof x.vence === "number" ? x.vence : 0,
              creada: typeof x.creada === "number" ? x.creada : Date.now(),
            };
          })
          .filter((c): c is Tarjeta => c !== null)
      : [];
    return { mazos, tarjetas };
  } catch {
    return { mazos: [], tarjetas: [] };
  }
}

function guardar(g: Guardado) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(g));
  } catch {
    /* modo incógnito: dura solo esta sesión */
  }
}

/** Reprograma una tarjeta según la calificación (SM-2 simplificado). */
export function programar(t: Tarjeta, cal: Calificacion, ahora = Date.now()): Tarjeta {
  let { facilidad, intervalo, repeticiones } = t;
  if (cal === "otra") {
    repeticiones = 0;
    intervalo = 0; // vuelve en esta misma sesión
    facilidad = Math.max(FACILIDAD_MIN, facilidad - 0.2);
    return { ...t, facilidad, intervalo, repeticiones, vence: ahora };
  }
  if (cal === "facil") {
    facilidad = facilidad + 0.15;
    intervalo = repeticiones === 0 ? 2 : Math.round(Math.max(1, intervalo) * facilidad * 1.3);
    repeticiones += 1;
  } else {
    // bien
    intervalo = repeticiones === 0 ? 1 : repeticiones === 1 ? 3 : Math.round(Math.max(1, intervalo) * facilidad);
    repeticiones += 1;
  }
  return { ...t, facilidad, intervalo, repeticiones, vence: ahora + intervalo * DIA };
}

interface RepasoState {
  cargado: boolean;
  mazos: Mazo[];
  tarjetas: Tarjeta[];
  cargar: () => void;
  crearMazo: (nombre: string, materia?: string) => string;
  renombrarMazo: (id: string, nombre: string, materia: string) => void;
  borrarMazo: (id: string) => void;
  agregarTarjeta: (mazoId: string, frente: string, reverso: string) => void;
  /** Importa varias tarjetas de un texto pegado (cada línea «término - definición»). Devuelve cuántas creó. */
  importarTexto: (mazoId: string, texto: string) => number;
  editarTarjeta: (id: string, frente: string, reverso: string) => void;
  borrarTarjeta: (id: string) => void;
  calificar: (id: string, cal: Calificacion) => void;
}

/** Separadores admitidos entre término y definición al importar: «-», «–», «:», «=», «|» o tabulador. */
const SEPARADOR = /\s*[\t–\-:=|]\s+|\t+/;

export const useRepasoStore = create<RepasoState>((set, get) => ({
  cargado: false,
  mazos: [],
  tarjetas: [],

  cargar: () => {
    if (get().cargado) return;
    const { mazos, tarjetas } = leer();
    set({ cargado: true, mazos, tarjetas });
  },

  crearMazo: (nombre, materia = "") => {
    const limpio = nombre.trim().slice(0, 80) || "Mazo";
    const mazo: Mazo = { id: crypto.randomUUID(), nombre: limpio, materia: materia.trim().slice(0, 60), creado: Date.now() };
    const mazos = [...get().mazos, mazo];
    set({ mazos });
    guardar({ mazos, tarjetas: get().tarjetas });
    return mazo.id;
  },

  renombrarMazo: (id, nombre, materia) => {
    const mazos = get().mazos.map((m) => (m.id === id ? { ...m, nombre: nombre.trim().slice(0, 80) || m.nombre, materia: materia.trim().slice(0, 60) } : m));
    set({ mazos });
    guardar({ mazos, tarjetas: get().tarjetas });
  },

  borrarMazo: (id) => {
    const mazos = get().mazos.filter((m) => m.id !== id);
    const tarjetas = get().tarjetas.filter((t) => t.mazoId !== id);
    set({ mazos, tarjetas });
    guardar({ mazos, tarjetas });
  },

  agregarTarjeta: (mazoId, frente, reverso) => {
    const f = frente.trim().slice(0, 500);
    const r = reverso.trim().slice(0, 1000);
    if (!f || !r) return;
    const tarjeta: Tarjeta = { id: crypto.randomUUID(), mazoId, frente: f, reverso: r, facilidad: FACILIDAD_INICIAL, intervalo: 0, repeticiones: 0, vence: 0, creada: Date.now() };
    const tarjetas = [...get().tarjetas, tarjeta];
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas });
  },

  importarTexto: (mazoId, texto) => {
    const nuevas: Tarjeta[] = [];
    for (const linea of texto.split("\n")) {
      const limpia = linea.trim();
      if (!limpia) continue;
      // Se parte solo en el PRIMER separador: «Ciclo - buscar - decodificar» conserva el guion de la definición.
      const corte = SEPARADOR.exec(limpia);
      if (!corte) continue;
      const frente = limpia.slice(0, corte.index).trim().slice(0, 500);
      const reverso = limpia.slice(corte.index + corte[0].length).trim().slice(0, 1000);
      if (!frente || !reverso) continue;
      nuevas.push({ id: crypto.randomUUID(), mazoId, frente, reverso, facilidad: FACILIDAD_INICIAL, intervalo: 0, repeticiones: 0, vence: 0, creada: Date.now() });
    }
    if (nuevas.length === 0) return 0;
    const tarjetas = [...get().tarjetas, ...nuevas];
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas });
    return nuevas.length;
  },

  editarTarjeta: (id, frente, reverso) => {
    const f = frente.trim().slice(0, 500);
    const r = reverso.trim().slice(0, 1000);
    if (!f || !r) return;
    const tarjetas = get().tarjetas.map((t) => (t.id === id ? { ...t, frente: f, reverso: r } : t));
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas });
  },

  borrarTarjeta: (id) => {
    const tarjetas = get().tarjetas.filter((t) => t.id !== id);
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas });
  },

  calificar: (id, cal) => {
    const tarjetas = get().tarjetas.map((t) => (t.id === id ? programar(t, cal) : t));
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas });
  },
}));

/** Tarjetas de un mazo que tocan ahora (vencidas o nuevas). */
export function pendientesDe(tarjetas: Tarjeta[], mazoId: string, ahora = Date.now()): Tarjeta[] {
  return tarjetas.filter((t) => t.mazoId === mazoId && t.vence <= ahora);
}
