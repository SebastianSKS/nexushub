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

/** Un repaso ya hecho: qué tarjetas se vieron y cómo salió cada una la primera vez. Sirve para repetirlo. */
export interface Sesion {
  id: string;
  mazoId: string;
  fecha: number;
  /** true = práctica: se estudió sin cambiar cuándo toca cada tarjeta. */
  practica: boolean;
  /** Una entrada por tarjeta vista, con la primera calificación que se le dio en ese repaso. */
  resultados: { id: string; cal: Calificacion }[];
}

/** Cuántos repasos se conservan por mazo (los más recientes). */
export const MAX_SESIONES_POR_MAZO = 20;

const CLAVE = "nexushub-repaso";
const DIA = 24 * 60 * 60 * 1000;
const FACILIDAD_INICIAL = 2.5;
const FACILIDAD_MIN = 1.3;
const CALIFICACIONES: readonly Calificacion[] = ["otra", "bien", "facil"];

/** Lee los repasos guardados descartando lo que venga roto (datos de otra versión o editados a mano). */
export function normalizarSesiones(dato: unknown): Sesion[] {
  if (!Array.isArray(dato)) return [];
  return dato
    .map((v): Sesion | null => {
      if (typeof v !== "object" || v === null) return null;
      const x = v as Record<string, unknown>;
      if (typeof x.id !== "string" || typeof x.mazoId !== "string" || typeof x.fecha !== "number" || !Array.isArray(x.resultados)) return null;
      const resultados = x.resultados.filter(
        (r): r is { id: string; cal: Calificacion } => typeof r === "object" && r !== null && typeof (r as { id?: unknown }).id === "string" && CALIFICACIONES.includes((r as { cal?: Calificacion }).cal!),
      );
      return resultados.length === 0 ? null : { id: x.id, mazoId: x.mazoId, fecha: x.fecha, practica: x.practica === true, resultados };
    })
    .filter((v): v is Sesion => v !== null);
}

interface Guardado {
  mazos: Mazo[];
  tarjetas: Tarjeta[];
  sesiones: Sesion[];
}

function leer(): Guardado {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { mazos: [], tarjetas: [], sesiones: [] };
    const d = JSON.parse(crudo) as { mazos?: unknown; tarjetas?: unknown; sesiones?: unknown };
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
    return { mazos, tarjetas, sesiones: normalizarSesiones(d.sesiones) };
  } catch {
    return { mazos: [], tarjetas: [], sesiones: [] };
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
  sesiones: Sesion[];
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
  /** Anota en el historial cómo salió una tarjeta dentro de un repaso (solo la primera calificación cuenta). */
  anotar: (sesionId: string, mazoId: string, practica: boolean, tarjetaId: string, cal: Calificacion, ahora?: number) => void;
}

/** Separadores admitidos entre término y definición al importar: «-», «–», «:», «=», «|» o tabulador. */
const SEPARADOR = /\s*[\t–\-:=|]\s+|\t+/;

export const useRepasoStore = create<RepasoState>((set, get) => ({
  cargado: false,
  mazos: [],
  tarjetas: [],
  sesiones: [],

  cargar: () => {
    if (get().cargado) return;
    set({ cargado: true, ...leer() });
  },

  crearMazo: (nombre, materia = "") => {
    const limpio = nombre.trim().slice(0, 80) || "Mazo";
    const mazo: Mazo = { id: crypto.randomUUID(), nombre: limpio, materia: materia.trim().slice(0, 60), creado: Date.now() };
    const mazos = [...get().mazos, mazo];
    set({ mazos });
    guardar({ mazos, tarjetas: get().tarjetas, sesiones: get().sesiones });
    return mazo.id;
  },

  renombrarMazo: (id, nombre, materia) => {
    const mazos = get().mazos.map((m) => (m.id === id ? { ...m, nombre: nombre.trim().slice(0, 80) || m.nombre, materia: materia.trim().slice(0, 60) } : m));
    set({ mazos });
    guardar({ mazos, tarjetas: get().tarjetas, sesiones: get().sesiones });
  },

  borrarMazo: (id) => {
    const mazos = get().mazos.filter((m) => m.id !== id);
    const tarjetas = get().tarjetas.filter((t) => t.mazoId !== id);
    const sesiones = get().sesiones.filter((x) => x.mazoId !== id);
    set({ mazos, tarjetas, sesiones });
    guardar({ mazos, tarjetas, sesiones });
  },

  agregarTarjeta: (mazoId, frente, reverso) => {
    const f = frente.trim().slice(0, 500);
    const r = reverso.trim().slice(0, 1000);
    if (!f || !r) return;
    const tarjeta: Tarjeta = { id: crypto.randomUUID(), mazoId, frente: f, reverso: r, facilidad: FACILIDAD_INICIAL, intervalo: 0, repeticiones: 0, vence: 0, creada: Date.now() };
    const tarjetas = [...get().tarjetas, tarjeta];
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas, sesiones: get().sesiones });
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
    guardar({ mazos: get().mazos, tarjetas, sesiones: get().sesiones });
    return nuevas.length;
  },

  editarTarjeta: (id, frente, reverso) => {
    const f = frente.trim().slice(0, 500);
    const r = reverso.trim().slice(0, 1000);
    if (!f || !r) return;
    const tarjetas = get().tarjetas.map((t) => (t.id === id ? { ...t, frente: f, reverso: r } : t));
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas, sesiones: get().sesiones });
  },

  borrarTarjeta: (id) => {
    const tarjetas = get().tarjetas.filter((t) => t.id !== id);
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas, sesiones: get().sesiones });
  },

  calificar: (id, cal) => {
    const tarjetas = get().tarjetas.map((t) => (t.id === id ? programar(t, cal) : t));
    set({ tarjetas });
    guardar({ mazos: get().mazos, tarjetas, sesiones: get().sesiones });
  },

  anotar: (sesionId, mazoId, practica, tarjetaId, cal, ahora = Date.now()) => {
    const previas = get().sesiones;
    const actual = previas.find((x) => x.id === sesionId);
    if (actual?.resultados.some((r) => r.id === tarjetaId)) return;
    const sesion: Sesion = actual
      ? { ...actual, resultados: [...actual.resultados, { id: tarjetaId, cal }] }
      : { id: sesionId, mazoId, fecha: ahora, practica, resultados: [{ id: tarjetaId, cal }] };
    let sesiones = actual ? previas.map((x) => (x.id === sesionId ? sesion : x)) : [...previas, sesion];
    // De cada mazo se quedan solo las más recientes, para que el historial no crezca sin fin.
    const delMazo = sesiones.filter((x) => x.mazoId === mazoId);
    if (delMazo.length > MAX_SESIONES_POR_MAZO) {
      const sobran = new Set(delMazo.slice(0, delMazo.length - MAX_SESIONES_POR_MAZO).map((x) => x.id));
      sesiones = sesiones.filter((x) => !sobran.has(x.id));
    }
    set({ sesiones });
    guardar({ mazos: get().mazos, tarjetas: get().tarjetas, sesiones });
  },
}));

/** Las tarjetas que en ese repaso no salieron a la primera. */
export function lasQueCostaron(sesion: Pick<Sesion, "resultados">): string[] {
  return sesion.resultados.filter((r) => r.cal === "otra").map((r) => r.id);
}

/** Cuándo toca el siguiente repaso del mazo (ms) si ahora no hay nada pendiente; null si no hay tarjetas por venir. */
export function proximoRepaso(tarjetas: Tarjeta[], mazoId: string, ahora = Date.now()): number | null {
  const futuras = tarjetas.filter((t) => t.mazoId === mazoId && t.vence > ahora).map((t) => t.vence);
  return futuras.length === 0 ? null : Math.min(...futuras);
}

/** Días de calendario entre hoy y una fecha: 0 = hoy, 1 = mañana. */
export function diasHasta(fecha: number, ahora = Date.now()): number {
  const aMedianoche = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((aMedianoche(fecha) - aMedianoche(ahora)) / DIA));
}

/** Tarjetas de un mazo que tocan ahora (vencidas o nuevas). */
export function pendientesDe(tarjetas: Tarjeta[], mazoId: string, ahora = Date.now()): Tarjeta[] {
  return tarjetas.filter((t) => t.mazoId === mazoId && t.vence <= ahora);
}

/**
 * Qué tarjetas entran en una ronda. Estudiar: las que tocan hoy. Practicar: todo el mazo en orden mezclado, o las de un
 * repaso anterior (todas, o solo las que costaron), saltando las que ya se borraron.
 */
export function idsDeRonda(
  estado: { tarjetas: Tarjeta[]; sesiones: Sesion[] },
  mazoId: string,
  practica: boolean,
  sesionId: string | null = null,
  soloCostaron = false,
  azar: () => number = Math.random,
): string[] {
  if (!practica) return pendientesDe(estado.tarjetas, mazoId).map((t) => t.id);
  const delMazo = estado.tarjetas.filter((t) => t.mazoId === mazoId).map((t) => t.id);
  if (sesionId) {
    const sesion = estado.sesiones.find((x) => x.id === sesionId && x.mazoId === mazoId);
    if (!sesion) return [];
    const existen = new Set(delMazo);
    return (soloCostaron ? lasQueCostaron(sesion) : sesion.resultados.map((r) => r.id)).filter((id) => existen.has(id));
  }
  // Mezcla de Fisher-Yates: en práctica el orden cambia para no aprenderse la posición.
  for (let i = delMazo.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [delMazo[i], delMazo[j]] = [delMazo[j]!, delMazo[i]!];
  }
  return delMazo;
}
