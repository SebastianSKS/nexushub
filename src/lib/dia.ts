import { aMinutos, clasesDelDia, diaDeSemana, type Clase } from "./horario/horario";
import { inicioDelDia, proximaOcurrenciaEvento, proximoCumple, type Repeticion } from "./calendario/fechas";

/**
 * Lo que necesita la tarjeta «Tu día» de Inicio: cómo van las clases de hoy (en clase, la que sigue, ya terminaste), qué
 * cae esta semana (eventos y cumpleaños) y qué apuntes siguen pendientes. Lógica pura: dado el momento de ahora, sin pantalla.
 */

// ─── Clases: ahora / lo que sigue ────────────────────────────────────────────────────────────────────────────────────

export type EstadoDelDia =
  /** Hay una clase en curso (y quizá otra después). */
  | { tipo: "en-clase"; clase: Clase; minutosParaFin: number; /** 0–1: cuánto de la clase ya pasó. */ progreso: number; siguiente: { clase: Clase; minutosParaInicio: number } | null }
  /** Aún queda alguna clase hoy y ahora no hay ninguna en curso. */
  | { tipo: "siguiente"; clase: Clase; minutosParaInicio: number }
  /** Hoy hubo clases y ya terminaron; `proximoDia` es la primera clase del próximo día con clases. */
  | { tipo: "terminado"; proximoDia: { dia: number; faltan: number; clase: Clase } | null }
  /** Hoy no hay clases: `proximoDia` es cuándo vuelven. */
  | { tipo: "libre"; proximoDia: { dia: number; faltan: number; clase: Clase } | null }
  /** No hay horario cargado. */
  | { tipo: "sin-horario" };

function primerDiaConClases(clases: readonly Clase[], desdeDia: number): { dia: number; faltan: number; clase: Clase } | null {
  for (let faltan = 1; faltan <= 7; faltan++) {
    const dia = (desdeDia + faltan) % 7;
    const primera = clasesDelDia(clases, dia)[0];
    if (primera) return { dia, faltan, clase: primera };
  }
  return null;
}

export function estadoDelDia(clases: readonly Clase[], ahora: Date): EstadoDelDia {
  if (clases.length === 0) return { tipo: "sin-horario" };
  const hoy = diaDeSemana(ahora);
  const delDia = clasesDelDia(clases, hoy);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const enCurso = delDia.find((c) => aMinutos(c.inicio) <= minAhora && minAhora < aMinutos(c.fin));
  const proxima = delDia.find((c) => aMinutos(c.inicio) > minAhora);

  if (enCurso) {
    const ini = aMinutos(enCurso.inicio);
    const fin = aMinutos(enCurso.fin);
    return {
      tipo: "en-clase",
      clase: enCurso,
      minutosParaFin: fin - minAhora,
      progreso: Math.min(1, Math.max(0, (minAhora - ini) / Math.max(1, fin - ini))),
      siguiente: proxima ? { clase: proxima, minutosParaInicio: aMinutos(proxima.inicio) - minAhora } : null,
    };
  }
  if (proxima) return { tipo: "siguiente", clase: proxima, minutosParaInicio: aMinutos(proxima.inicio) - minAhora };
  const proximoDia = primerDiaConClases(clases, hoy);
  return delDia.length > 0 ? { tipo: "terminado", proximoDia } : { tipo: "libre", proximoDia };
}

/** 45 → «45 min»; 80 → «1 h 20 min»; 120 → «2 h». Las partes, para que quien dibuja las escriba en el idioma de ahora. */
export function partesDeDuracion(minutos: number): { horas: number; minutos: number } {
  const total = Math.max(0, Math.round(minutos));
  return { horas: Math.floor(total / 60), minutos: total % 60 };
}

// ─── Esta semana ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface EventoBase {
  id: string;
  titulo: string;
  categoria: string;
  fecha: string;
  hora: string | null;
  color: string;
  repetir: Repeticion;
}

export interface AmigoBase {
  id: string;
  nombre: string;
  dia: number;
  mes: number;
  anio: number | null;
  color: string;
}

export interface ItemSemana {
  clave: string;
  tipo: "evento" | "cumple";
  titulo: string;
  color: string;
  /** Solo eventos: tarea, examen, cita… */
  categoria?: string;
  fecha: Date;
  /** 0 = hoy, 1 = mañana… */
  dias: number;
  /** «HH:MM» o null si es de todo el día. */
  hora: string | null;
  /** Solo cumpleaños: la edad que cumple, si se sabe. */
  edad?: number | null;
}

/**
 * Lo que cae en los próximos `dias` días (hoy incluido): eventos y cumpleaños, lo más cercano primero, con hora dentro del
 * mismo día. Un evento con hora que ya empezó hoy no se cuenta; uno de todo el día sí.
 */
export function proximosDeLaSemana(eventos: readonly EventoBase[], amigos: readonly AmigoBase[], ahora: Date, dias = 7, max = 6): ItemSemana[] {
  const hoy = inicioDelDia(ahora);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const items: ItemSemana[] = [];

  for (const e of eventos) {
    const p = proximaOcurrenciaEvento(e.fecha, e.repetir, hoy);
    if (!p || p.dias >= dias) continue;
    if (p.dias === 0 && e.hora && aMinutos(e.hora) < minAhora) continue;
    items.push({ clave: `e-${e.id}`, tipo: "evento", titulo: e.titulo, color: e.color, categoria: e.categoria, fecha: p.fecha, dias: p.dias, hora: e.hora });
  }
  for (const a of amigos) {
    const p = proximoCumple(a, hoy);
    if (p.dias >= dias) continue;
    items.push({ clave: `a-${a.id}`, tipo: "cumple", titulo: a.nombre, color: a.color, fecha: p.fecha, dias: p.dias, hora: null, edad: p.edad });
  }
  return items
    .sort((x, y) => x.dias - y.dias || (x.hora ?? "").localeCompare(y.hora ?? "") || x.titulo.localeCompare(y.titulo, "es"))
    .slice(0, max);
}

/** ¿Falta poco? Los exámenes de hoy o mañana se destacan. */
export const esUrgente = (i: ItemSemana): boolean => i.dias <= 1 && i.tipo === "evento" && (i.categoria === "examen" || i.categoria === "tarea");

// ─── Pendientes ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface NotaBase {
  id: string;
  texto: string;
  hecha: boolean;
}

/** Los apuntes que todavía no se tachan: cuántos hay y los primeros. */
export function pendientesDeNotas<N extends NotaBase>(notas: readonly N[], max = 3): { total: number; primeros: N[] } {
  const sin = notas.filter((n) => !n.hecha);
  return { total: sin.length, primeros: sin.slice(0, max) };
}

/** ¿Hay algo que contar en la tarjeta? Si no, no se dibuja (los estados vacíos de cada sección ya enseñan a empezar). */
export function hayAlgoQueMostrar(estado: EstadoDelDia, semana: readonly ItemSemana[], pendientes: number): boolean {
  return estado.tipo !== "sin-horario" || semana.length > 0 || pendientes > 0;
}
