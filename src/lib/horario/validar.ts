import { PATRON_HORA, aMinutos, type Clase } from "./horario";

/**
 * Convierte algo leído del almacenamiento (o de un archivo que alguien compartió) en una clase válida, o null si no sirve:
 * exige id, materia, un día de 0 a 6 y horas «HH:MM» con el fin después del inicio; corta los textos largos y corrige el color.
 */
export function claseValida(x: unknown): Clase | null {
  if (typeof x !== "object" || x === null) return null;
  const c = x as Record<string, unknown>;
  const dia = Number(c.dia);
  if (typeof c.id !== "string" || typeof c.materia !== "string" || !c.materia.trim()) return null;
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) return null;
  if (typeof c.inicio !== "string" || !PATRON_HORA.test(c.inicio) || typeof c.fin !== "string" || !PATRON_HORA.test(c.fin)) return null;
  if (aMinutos(c.fin) <= aMinutos(c.inicio)) return null;
  return {
    id: c.id,
    materia: c.materia.trim().slice(0, 60),
    codigo: typeof c.codigo === "string" ? c.codigo.slice(0, 20) : "",
    docente: typeof c.docente === "string" ? c.docente.slice(0, 60) : "",
    aula: typeof c.aula === "string" ? c.aula.slice(0, 20) : "",
    dia,
    inicio: c.inicio,
    fin: c.fin,
    color: typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#2b7de9",
  };
}
