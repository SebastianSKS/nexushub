import { traducir, T } from "@/lib/i18n";
/** Utilidades de fechas para el calendario de cumpleaños. Todo en hora local; los meses van de 1 a 12. */

export const MESES = [T("enero"), T("febrero"), T("marzo"), T("abril"), T("mayo"), T("junio"), T("julio"), T("agosto"), T("septiembre"), T("octubre"), T("noviembre"), T("diciembre")] as const;
export const DIAS_CORTOS = [T("Lun"), T("Mar"), T("Mié"), T("Jue"), T("Vie"), T("Sáb"), T("Dom")] as const;
const DIAS_LARGOS = [T("domingo"), T("lunes"), T("martes"), T("miércoles"), T("jueves"), T("viernes"), T("sábado")] as const;

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

/** Los 7 días (lunes a domingo) de la semana que contiene `fecha`. */
export function diasDeLaSemana(fecha: Date): Date[] {
  const f = inicioDelDia(fecha);
  const desfase = (f.getDay() + 6) % 7; // lunes = 0
  return Array.from({ length: 7 }, (_, i) => new Date(f.getFullYear(), f.getMonth(), f.getDate() - desfase + i));
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

export type Repeticion = "no" | "semanal" | "mensual";

/** ¿El evento (que empieza en `inicioIso` y se repite según `repetir`) ocurre este día concreto? */
export function eventoOcurreEn(inicioIso: string, repetir: Repeticion, fecha: Date): boolean {
  const inicio = fechaDesdeIso(inicioIso);
  const f = inicioDelDia(fecha);
  if (f < inicio) return false;
  if (repetir === "no") return diferenciaDias(inicio, f) === 0;
  if (repetir === "semanal") return diferenciaDias(inicio, f) % 7 === 0;
  // mensual: mismo día del mes que el de inicio; en meses más cortos, el último día del mes.
  const diaObjetivo = Math.min(inicio.getDate(), diasEnMes(f.getFullYear(), f.getMonth() + 1));
  return f.getDate() === diaObjetivo;
}

/** Próxima ocurrencia de un evento (que puede repetirse) a partir de `hoy` (incluido). Null si ya pasó y no se repite. */
export function proximaOcurrenciaEvento(inicioIso: string, repetir: Repeticion, hoy: Date): Proximo & { edad: null } | null {
  const inicio = fechaDesdeIso(inicioIso);
  const h = inicioDelDia(hoy);
  if (repetir === "no") {
    const dias = diferenciaDias(h, inicio);
    return dias >= 0 ? { fecha: inicio, dias, edad: null } : null;
  }
  if (inicio >= h) return { fecha: inicio, dias: diferenciaDias(h, inicio), edad: null };
  if (repetir === "semanal") {
    const ciclos = Math.ceil(diferenciaDias(inicio, h) / 7);
    const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + ciclos * 7);
    return { fecha, dias: diferenciaDias(h, fecha), edad: null };
  }
  // mensual: avanza mes a mes desde el inicio hasta llegar a `hoy` o más adelante.
  let anio = inicio.getFullYear();
  let mes = inicio.getMonth();
  let fecha = inicio;
  while (fecha < h) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      anio += 1;
    }
    fecha = new Date(anio, mes, Math.min(inicio.getDate(), diasEnMes(anio, mes + 1)));
  }
  return { fecha, dias: diferenciaDias(h, fecha), edad: null };
}

/** Nombre del mes (0 = enero) en el idioma de ahora. */
export const nombreMes = (i: number) => traducir(MESES[i]!);
/** Nombre corto del día de la semana (0 = lunes) en el idioma de ahora. */
export const nombreDiaCorto = (i: number) => traducir(DIAS_CORTOS[i]!);
export const nombreDia = (d: Date) => traducir(DIAS_LARGOS[d.getDay()]!);
export const fechaLarga = (d: Date) => traducir("{dia} {d} de {mes}", { dia: nombreDia(d), d: d.getDate(), mes: nombreMes(d.getMonth()) });
export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function cuando(dias: number): string {
  if (dias === 0) return traducir("Hoy");
  if (dias === 1) return traducir("Mañana");
  return traducir("En {n} días", { n: dias });
}

export function saludo(hora: number): string {
  return hora < 6 ? traducir("Buenas noches") : hora < 12 ? traducir("Buenos días") : hora < 19 ? traducir("Buenas tardes") : traducir("Buenas noches");
}
