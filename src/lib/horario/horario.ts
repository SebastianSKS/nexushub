/** Una clase del horario semanal: una materia, un día de la semana y un intervalo de horas. */
export interface Clase {
  id: string;
  materia: string;
  /** Clave de la materia si la hay, por ejemplo «SDC-1021». */
  codigo: string;
  docente: string;
  aula: string;
  /** 0 = lunes … 6 = domingo. */
  dia: number;
  /** "HH:MM" */
  inicio: string;
  fin: string;
  /** Color de la clase (hexadecimal). */
  color: string;
}

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/** Día de la semana de una fecha, con el lunes como 0 (el `getDay()` de JavaScript empieza en el domingo). */
export const diaDeSemana = (f: Date) => (f.getDay() + 6) % 7;

export const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const deMinutos = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Clases de un día, ordenadas por hora de inicio. */
export function clasesDelDia(clases: readonly Clase[], dia: number): Clase[] {
  return clases.filter((c) => c.dia === dia).sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));
}

export type EstadoClase = "ahora" | "siguiente" | "despues" | "terminada";

/**
 * Lo que queda del día: cada clase con su estado respecto a `ahora` (la que está en curso, la próxima,
 * las siguientes y las ya terminadas).
 */
export function estadoDelDia(clases: readonly Clase[], dia: number, ahora: Date): { clase: Clase; estado: EstadoClase }[] {
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  let yaHaySiguiente = false;
  return clasesDelDia(clases, dia).map((clase) => {
    if (aMinutos(clase.fin) <= minAhora) return { clase, estado: "terminada" };
    if (aMinutos(clase.inicio) <= minAhora) return { clase, estado: "ahora" };
    if (!yaHaySiguiente) {
      yaHaySiguiente = true;
      return { clase, estado: "siguiente" };
    }
    return { clase, estado: "despues" };
  });
}

/** El próximo día (desde hoy, incluido si aún le quedan clases) en que hay clases, y cuántos días faltan. */
export function proximoDiaConClases(clases: readonly Clase[], ahora: Date): { dia: number; faltan: number } | null {
  if (clases.length === 0) return null;
  const hoy = diaDeSemana(ahora);
  for (let faltan = 0; faltan < 7; faltan++) {
    const dia = (hoy + faltan) % 7;
    const delDia = estadoDelDia(clases, dia, ahora);
    const quedan = faltan === 0 ? delDia.some((x) => x.estado !== "terminada") : delDia.length > 0;
    if (quedan) return { dia, faltan };
  }
  return null;
}

/** Texto blanco u oscuro según el brillo del color de fondo, para que siempre se lea. */
export function colorDeTexto(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#1b1b1b" : "#ffffff";
}
