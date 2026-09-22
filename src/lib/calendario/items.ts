import type { Amigo, Evento } from "@/store/calendario-store";
import { cumpleEn, eventoOcurreEn } from "./fechas";

/** Un cumpleaños o un evento que cae en un día concreto, ya en forma común para dibujarlo. */
export interface ItemDia {
  clave: string;
  tipo: "amigo" | "evento";
  titulo: string;
  color: string;
  /** null = todo el día (siempre antes que los que sí tienen hora). */
  hora: string | null;
  ref: Amigo | Evento;
}

/** Cumpleaños y eventos (ya resueltas sus repeticiones) que caen en `fecha`, ordenados: todo el día primero, luego por hora. */
export function itemsDelDia(amigos: Amigo[], eventos: Evento[], fecha: Date): ItemDia[] {
  const items: ItemDia[] = [
    ...amigos.filter((a) => cumpleEn(a, fecha)).map((a): ItemDia => ({ clave: `a-${a.id}`, tipo: "amigo", titulo: a.nombre, color: a.color, hora: null, ref: a })),
    ...eventos.filter((e) => eventoOcurreEn(e.fecha, e.repetir, fecha)).map((e): ItemDia => ({ clave: `e-${e.id}`, tipo: "evento", titulo: e.titulo, color: e.color, hora: e.hora, ref: e })),
  ];
  return items.sort((a, b) => {
    if (!a.hora && !b.hora) return a.titulo.localeCompare(b.titulo, "es");
    if (!a.hora) return -1;
    if (!b.hora) return 1;
    return a.hora.localeCompare(b.hora);
  });
}
