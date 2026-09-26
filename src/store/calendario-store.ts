import { create } from "zustand";
import { T } from "@/lib/i18n";
import { esCategoria, type CategoriaEvento } from "@/lib/calendario/categorias";
import { diasEnMes } from "@/lib/calendario/fechas";

export interface Amigo {
  id: string;
  nombre: string;
  dia: number;
  mes: number;
  anio: number | null;
  /** Color del amigo en el calendario (hexadecimal). */
  color: string;
  nota: string;
  /** false = no avisar de este cumpleaños. */
  avisar: boolean;
}

/** Evento general (cita, recordatorio…): una fecha, con la opción de repetirse cada semana o cada mes. */
export interface Evento {
  id: string;
  titulo: string;
  /** Tipo de evento (tarea, examen, cita…): lo marca en el calendario. */
  categoria: CategoriaEvento;
  /** Fecha de la primera ocurrencia, en formato "AAAA-MM-DD". */
  fecha: string;
  /** Hora "HH:MM", o null si es de todo el día. */
  hora: string | null;
  color: string;
  nota: string;
  avisar: boolean;
  /** "no" = una sola vez; si no, se repite indefinidamente desde `fecha`. */
  repetir: "no" | "semanal" | "mensual";
}

export interface ConfigAvisos {
  mismoDia: boolean;
  unDiaAntes: boolean;
  unaSemanaAntes: boolean;
  /** Hora a partir de la cual se avisa (0-23). */
  hora: number;
}

/** Colores para marcar a cada amigo. Los azules van primero. */
export const COLORES_AMIGO: readonly { nombre: string; valor: string }[] = [
  { nombre: T("Azul"), valor: "#2b7de9" },
  { nombre: T("Celeste"), valor: "#3fb6f5" },
  { nombre: T("Turquesa"), valor: "#14b8a6" },
  { nombre: T("Verde"), valor: "#3fae5a" },
  { nombre: T("Amarillo"), valor: "#e3b60f" },
  { nombre: T("Naranja"), valor: "#f0812a" },
  { nombre: T("Rojo"), valor: "#e5484d" },
  { nombre: T("Rosa"), valor: "#e5509f" },
  { nombre: T("Violeta"), valor: "#8b5cf6" },
  { nombre: T("Gris"), valor: "#7c8794" },
];

const CLAVE_AMIGOS = "nexushub-cumples";
const CLAVE_EVENTOS = "nexushub-eventos";
const CLAVE_AVISOS = "nexushub-cumples-avisos";
const CLAVE_AVISADOS = "nexushub-cumples-avisados";
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const AVISOS_PREDETERMINADOS: ConfigAvisos = { mismoDia: true, unDiaAntes: true, unaSemanaAntes: false, hora: 9 };

function leerJson<T>(clave: string): T | null {
  try {
    const crudo = window.localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null; // almacenamiento bloqueado o JSON dañado
  }
}
function escribirJson(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo incógnito: los datos duran solo esta sesión */
  }
}

/** Valida cada amigo leído del almacenamiento: un dato dañado se descarta en vez de romper la pantalla. */
function amigoValido(x: unknown): Amigo | null {
  if (typeof x !== "object" || x === null) return null;
  const a = x as Record<string, unknown>;
  const dia = Number(a.dia);
  const mes = Number(a.mes);
  if (typeof a.id !== "string" || typeof a.nombre !== "string" || !a.nombre.trim()) return null;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(dia) || dia < 1 || dia > diasEnMes(2000, mes)) return null;
  const anio = a.anio === null || a.anio === undefined ? null : Number(a.anio);
  return {
    id: a.id,
    nombre: a.nombre.trim().slice(0, 40),
    dia,
    mes,
    anio: anio !== null && Number.isInteger(anio) && anio >= 1900 && anio <= new Date().getFullYear() ? anio : null,
    color: typeof a.color === "string" && /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : COLORES_AMIGO[0]!.valor,
    nota: typeof a.nota === "string" ? a.nota.slice(0, 200) : "",
    avisar: a.avisar !== false,
  };
}

/** Valida cada evento leído del almacenamiento: un dato dañado se descarta en vez de romper la pantalla. */
function eventoValido(x: unknown): Evento | null {
  if (typeof x !== "object" || x === null) return null;
  const e = x as Record<string, unknown>;
  if (typeof e.id !== "string" || typeof e.titulo !== "string" || !e.titulo.trim()) return null;
  if (typeof e.fecha !== "string" || !PATRON_FECHA.test(e.fecha)) return null;
  return {
    id: e.id,
    titulo: e.titulo.trim().slice(0, 60),
    categoria: esCategoria(e.categoria) ? e.categoria : "otro", // los eventos guardados antes de las categorías quedan en «Otro»
    fecha: e.fecha,
    hora: typeof e.hora === "string" && PATRON_HORA.test(e.hora) ? e.hora : null,
    color: typeof e.color === "string" && /^#[0-9a-f]{6}$/i.test(e.color) ? e.color : COLORES_AMIGO[0]!.valor,
    nota: typeof e.nota === "string" ? e.nota.slice(0, 200) : "",
    avisar: e.avisar !== false,
    repetir: e.repetir === "semanal" || e.repetir === "mensual" ? e.repetir : "no",
  };
}

/** Avisos en pantalla dentro de la aplicación (además de la notificación del sistema). */
export interface AvisoPantalla {
  id: string;
  titulo: string;
  texto: string;
  /** A dónde lleva el aviso al pulsarlo; por defecto, el Calendario. `null` = sin enlace (un aviso breve). */
  destino?: { ruta: string; etiqueta: string; glifo: "calendario" | "reloj" | "inicio" | "musica" } | null;
  /** Milisegundos tras los que se cierra solo; sin él, se queda hasta que se cierre. */
  autocerrar?: number;
}

interface CalendarioState {
  cargado: boolean;
  amigos: Amigo[];
  eventos: Evento[];
  avisos: ConfigAvisos;
  /** Claves «amigo|fecha|anticipación» ya avisadas, para no repetir. */
  avisados: string[];
  pendientes: AvisoPantalla[];

  cargar: () => void;
  guardarAmigo: (a: Omit<Amigo, "id"> & { id?: string }) => Amigo;
  quitarAmigo: (id: string) => void;
  guardarEvento: (e: Omit<Evento, "id"> & { id?: string }) => Evento;
  quitarEvento: (id: string) => void;
  /** Añade amigos y eventos en bloque (importación de .ics); ignora duplicados exactos. */
  importar: (amigos: Omit<Amigo, "id">[], eventos: Omit<Evento, "id">[]) => { amigos: number; eventos: number };
  cambiarAvisos: (parcial: Partial<ConfigAvisos>) => void;
  marcarAvisado: (clave: string) => void;
  yaAvisado: (clave: string) => boolean;
  mostrarAviso: (a: Omit<AvisoPantalla, "id">) => void;
  cerrarAviso: (id: string) => void;
}

export const useCalendarioStore = create<CalendarioState>((set, get) => ({
  cargado: false,
  amigos: [],
  eventos: [],
  avisos: AVISOS_PREDETERMINADOS,
  avisados: [],
  pendientes: [],

  cargar: () => {
    if (get().cargado) return;
    const amigos = (leerJson<unknown[]>(CLAVE_AMIGOS) ?? []).map(amigoValido).filter((a): a is Amigo => a !== null);
    const eventos = (leerJson<unknown[]>(CLAVE_EVENTOS) ?? []).map(eventoValido).filter((e): e is Evento => e !== null);
    const a = leerJson<Partial<ConfigAvisos>>(CLAVE_AVISOS) ?? {};
    const hora = Number(a.hora);
    set({
      cargado: true,
      amigos,
      eventos,
      avisos: {
        mismoDia: a.mismoDia !== false,
        unDiaAntes: a.unDiaAntes !== false,
        unaSemanaAntes: a.unaSemanaAntes === true,
        hora: Number.isInteger(hora) && hora >= 0 && hora <= 23 ? hora : AVISOS_PREDETERMINADOS.hora,
      },
      avisados: (leerJson<string[]>(CLAVE_AVISADOS) ?? []).filter((x) => typeof x === "string").slice(-400),
    });
  },

  guardarAmigo: (datos) => {
    const amigo: Amigo = { ...datos, id: datos.id ?? crypto.randomUUID() };
    const existe = get().amigos.some((x) => x.id === amigo.id);
    const amigos = existe ? get().amigos.map((x) => (x.id === amigo.id ? amigo : x)) : [...get().amigos, amigo];
    set({ amigos });
    escribirJson(CLAVE_AMIGOS, amigos);
    return amigo;
  },

  quitarAmigo: (id) => {
    const amigos = get().amigos.filter((x) => x.id !== id);
    set({ amigos });
    escribirJson(CLAVE_AMIGOS, amigos);
  },

  guardarEvento: (datos) => {
    const evento: Evento = { ...datos, id: datos.id ?? crypto.randomUUID() };
    const existe = get().eventos.some((x) => x.id === evento.id);
    const eventos = existe ? get().eventos.map((x) => (x.id === evento.id ? evento : x)) : [...get().eventos, evento];
    set({ eventos });
    escribirJson(CLAVE_EVENTOS, eventos);
    return evento;
  },

  quitarEvento: (id) => {
    const eventos = get().eventos.filter((x) => x.id !== id);
    set({ eventos });
    escribirJson(CLAVE_EVENTOS, eventos);
  },

  importar: (amigosNuevos, eventosNuevos) => {
    const s = get();
    // Duplicado exacto: mismo nombre y misma fecha (amigo) o mismo título y misma fecha (evento).
    const amigosFiltrados = amigosNuevos.filter((a) => !s.amigos.some((x) => x.nombre === a.nombre && x.dia === a.dia && x.mes === a.mes));
    const eventosFiltrados = eventosNuevos.filter((e) => !s.eventos.some((x) => x.titulo === e.titulo && x.fecha === e.fecha));
    const amigos = [...s.amigos, ...amigosFiltrados.map((a) => ({ ...a, id: crypto.randomUUID() }))];
    const eventos = [...s.eventos, ...eventosFiltrados.map((e) => ({ ...e, id: crypto.randomUUID() }))];
    set({ amigos, eventos });
    escribirJson(CLAVE_AMIGOS, amigos);
    escribirJson(CLAVE_EVENTOS, eventos);
    return { amigos: amigosFiltrados.length, eventos: eventosFiltrados.length };
  },

  cambiarAvisos: (parcial) => {
    const avisos = { ...get().avisos, ...parcial };
    set({ avisos });
    escribirJson(CLAVE_AVISOS, avisos);
  },

  marcarAvisado: (clave) => {
    const avisados = [...get().avisados.filter((x) => x !== clave), clave].slice(-400);
    set({ avisados });
    escribirJson(CLAVE_AVISADOS, avisados);
  },
  yaAvisado: (clave) => get().avisados.includes(clave),

  mostrarAviso: (a) => {
    const id = crypto.randomUUID();
    set((s) => ({ pendientes: [...s.pendientes, { ...a, id }].slice(-5) }));
    if (a.autocerrar) setTimeout(() => get().cerrarAviso(id), a.autocerrar);
  },
  cerrarAviso: (id) => set((s) => ({ pendientes: s.pendientes.filter((x) => x.id !== id) })),
}));
