/** Utilidades de fechas para el calendario de cumpleaños. Todo en hora local; los meses van de 1 a 12. */

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] as const;
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

export const esBisiesto = (anio: number) => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

export function diasEnMes(anio: number, mes: number): number {
  return [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1]!;
}

export const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Diferencia en días completos (b - a), ignorando la hora y los cambios de horario. */
export function diferenciaDias(a: Date, b: Date): number {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
}

export const claveFecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface Cumple {
  dia: number;
  mes: number;
  /** Año de nacimiento, si se conoce. */
  anio: number | null;
}

/** Fecha en la que se celebra el cumpleaños en un año concreto: el 29 de febrero pasa al 28 en años no bisiestos. */
export function fechaEnAnio(c: Cumple, anio: number): Date {
  const dia = c.mes === 2 && c.dia === 29 && !esBisiesto(anio) ? 28 : c.dia;
  return new Date(anio, c.mes - 1, dia);
}

export interface Proximo {
  fecha: Date;
  /** Días que faltan (0 = hoy). */
  dias: number;
  /** Edad que cumple, si se conoce el año de nacimiento. */
  edad: number | null;
}

/** Próxima celebración a partir de `hoy` (incluido). */
export function proximoCumple(c: Cumple, hoy: Date): Proximo {
  const h = inicioDelDia(hoy);
  let fecha = fechaEnAnio(c, h.getFullYear());
  if (fecha < h) fecha = fechaEnAnio(c, h.getFullYear() + 1);
  return { fecha, dias: diferenciaDias(h, fecha), edad: c.anio ? fecha.getFullYear() - c.anio : null };
}

/** ¿El cumpleaños cae en este día concreto? */
export function cumpleEn(c: Cumple, fecha: Date): boolean {
  const f = fechaEnAnio(c, fecha.getFullYear());
  return f.getMonth() === fecha.getMonth() && f.getDate() === fecha.getDate();
}

/** Las 6 semanas (42 días) que se dibujan para un mes, empezando en lunes. */
export function diasDelMes(anio: number, mes: number): { fecha: Date; delMes: boolean }[] {
  const primero = new Date(anio, mes - 1, 1);
  const desfase = (primero.getDay() + 6) % 7; // lunes = 0
  return Array.from({ length: 42 }, (_, i) => {
    const fecha = new Date(anio, mes - 1, 1 - desfase + i);
    return { fecha, delMes: fecha.getMonth() === mes - 1 };
  });
}

/** Convierte "AAAA-MM-DD" (hora local, sin desfases de zona horaria) a Date. */
export function fechaDesdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio!, mes! - 1, dia!);
}

/** Días que faltan (0 = hoy, negativo = ya pasó) hasta una fecha concreta "AAAA-MM-DD". */
export function diasHastaIso(iso: string, hoy: Date): number {
  return diferenciaDias(inicioDelDia(hoy), fechaDesdeIso(iso));
}

export const nombreDia = (d: Date) => DIAS_LARGOS[d.getDay()]!;
export const fechaLarga = (d: Date) => `${nombreDia(d)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function cuando(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

export function saludo(hora: number): string {
  return hora < 6 ? "Buenas noches" : hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}
