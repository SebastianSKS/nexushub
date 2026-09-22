import type { Fuente, Pista } from "@/store/reproductor-store";

/**
 * Cada fuente (YouTube, Spotify) implementa este contrato y se registra aquí. Los métodos
 * opcionales solo existen si la fuente realmente los soporta; la barra de reproducción muestra
 * únicamente los controles que la fuente activa puede cumplir.
 */
export interface Controlador {
  /** Carga y empieza a reproducir esta pista. */
  cargar: (pista: Pista, reproducir: boolean) => void;
  reanudar: () => void;
  pausar: () => void;
  buscar?: (segundos: number) => void;
  siguiente?: () => void;
  anterior?: () => void;
  volumen?: (v: number) => void;
  aleatorio?: (activo: boolean) => void;
  repetir?: (modo: "no" | "una" | "todas") => void;
}

const registro = new Map<Fuente, Controlador>();

export function registrarControlador(fuente: Fuente, c: Controlador | null): void {
  if (c) registro.set(fuente, c);
  else registro.delete(fuente);
}

export function controlador(fuente: Fuente | null): Controlador | undefined {
  return fuente ? registro.get(fuente) : undefined;
}

export function todosLosControladores(): [Fuente, Controlador][] {
  return [...registro.entries()];
}
