import { create } from "zustand";
import type { Descargado } from "@/services/documents/download";
import type { QueuedFile, ResultItem, ToolId } from "@/types/documents";

/**
 * La cola de conversiones de Documentos: cada trabajo guarda su herramienta, sus archivos y las opciones que tenía al
 * pulsar el botón, así que se puede seguir preparando otro mientras tanto. Vive solo mientras Nexo está abierto (los
 * resultados son archivos en memoria). Quien los ejecuta, uno tras otro, es services/documents/cola.ts.
 */

export type EstadoTrabajo = "esperando" | "procesando" | "listo" | "error" | "cancelado";

export interface Trabajo {
  id: string;
  toolId: ToolId;
  files: QueuedFile[];
  options: unknown;
  estado: EstadoTrabajo;
  /** 0-100 */
  progreso: number;
  mensaje: string;
  resultados: ResultItem[];
  avisos: string[];
  error?: { message: string; hint?: string };
  /** Qué se descargó ya y dónde quedó (o por qué falló), por id de resultado («zip» para el paquete). */
  guardados: Record<string, Descargado | { error: string }>;
}

interface ColaState {
  trabajos: Trabajo[];
  agregar: (nuevo: Pick<Trabajo, "toolId" | "files" | "options">) => string;
  cambiar: (id: string, cambios: Partial<Trabajo>) => void;
  /** El que se está procesando no se puede quitar: primero hay que cancelarlo. */
  quitar: (id: string) => void;
  quitarTerminados: () => void;
  anotarGuardado: (id: string, clave: string, estado: Descargado | { error: string }) => void;
}

export const siguienteEnEspera = (trabajos: Trabajo[]): Trabajo | undefined => trabajos.find((t) => t.estado === "esperando");
export const estaPendiente = (t: Trabajo): boolean => t.estado === "esperando" || t.estado === "procesando";
export const hayPendientes = (trabajos: Trabajo[]): boolean => trabajos.some(estaPendiente);

export const useColaStore = create<ColaState>((set) => ({
  trabajos: [],

  agregar: (nuevo) => {
    const id = crypto.randomUUID();
    set((s) => ({ trabajos: [...s.trabajos, { ...nuevo, id, estado: "esperando", progreso: 0, mensaje: "", resultados: [], avisos: [], guardados: {} }] }));
    return id;
  },
  cambiar: (id, cambios) => set((s) => ({ trabajos: s.trabajos.map((t) => (t.id === id ? { ...t, ...cambios } : t)) })),
  quitar: (id) => set((s) => ({ trabajos: s.trabajos.filter((t) => t.id !== id || t.estado === "procesando") })),
  quitarTerminados: () => set((s) => ({ trabajos: s.trabajos.filter(estaPendiente) })),
  anotarGuardado: (id, clave, estado) => set((s) => ({ trabajos: s.trabajos.map((t) => (t.id === id ? { ...t, guardados: { ...t.guardados, [clave]: estado } } : t)) })),
}));
