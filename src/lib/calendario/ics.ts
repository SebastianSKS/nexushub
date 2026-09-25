/**
 * Exportar/importar el calendario en formato iCalendar (.ics), compatible con Google Calendar,
 * Outlook, Apple Calendar, etc. Los cumpleaños se guardan como eventos que se repiten cada año
 * (RRULE:FREQ=YEARLY); los eventos generales, como una fecha suelta. Sin librerías: el formato es
 * texto plano línea por línea (RFC 5545), igual que el resto de los formatos de Documentos.
 */
import type { Amigo, Evento } from "@/store/calendario-store";
import { COLORES_AMIGO } from "@/store/calendario-store";
import { CATEGORIAS, esCategoria, type CategoriaEvento } from "./categorias";
import { diasEnMes } from "./fechas";

const CRLF = "\r\n";

/** Escapa coma, punto y coma, barra invertida y saltos de línea, tal como pide el formato. */
function escapar(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Marca de tiempo UTC "AAAAMMDDTHHMMSSZ" para DTSTAMP (obligatoria, no es la fecha del evento). */
function marcaAhora(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

/** Arma el .ics completo a partir de los cumpleaños y los eventos. */
export function generarIcs(amigos: Amigo[], eventos: Evento[]): string {
  const lineas: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nexo//Calendario//ES", "CALSCALE:GREGORIAN"];
  const marca = marcaAhora();

  for (const a of amigos) {
    // Sin año conocido, se usa 2000 (bisiesto: admite el 29 de febrero) solo para tener una fecha de inicio válida.
    const anio = a.anio ?? 2000;
    const dia = a.mes === 2 && a.dia === 29 && diasEnMes(anio, 2) < 29 ? 28 : a.dia;
    lineas.push(
      "BEGIN:VEVENT",
      `UID:amigo-${a.id}@nexushub`,
      `DTSTAMP:${marca}`,
      `DTSTART;VALUE=DATE:${anio}${pad2(a.mes)}${pad2(dia)}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:${escapar(`Cumpleaños de ${a.nombre}`)}`,
    );
    if (a.nota) lineas.push(`DESCRIPTION:${escapar(a.nota)}`);
    lineas.push("END:VEVENT");
  }

  for (const e of eventos) {
    const fecha = e.fecha.replace(/-/g, "");
    lineas.push("BEGIN:VEVENT", `UID:evento-${e.id}@nexushub`, `DTSTAMP:${marca}`);
    if (e.hora) {
      const [h, m] = e.hora.split(":");
      lineas.push(`DTSTART:${fecha}T${pad2(Number(h))}${pad2(Number(m))}00`);
    } else {
      lineas.push(`DTSTART;VALUE=DATE:${fecha}`);
    }
    if (e.repetir === "semanal") lineas.push("RRULE:FREQ=WEEKLY");
    else if (e.repetir === "mensual") lineas.push("RRULE:FREQ=MONTHLY");
    lineas.push(`SUMMARY:${escapar(e.titulo)}`);
    if (e.categoria !== "otro") lineas.push(`CATEGORIES:${e.categoria.toUpperCase()}`);
    if (e.nota) lineas.push(`DESCRIPTION:${escapar(e.nota)}`);
    lineas.push("END:VEVENT");
  }

  lineas.push("END:VCALENDAR");
  return lineas.join(CRLF) + CRLF;
}

export interface ResultadoImportacion {
  amigos: Omit<Amigo, "id">[];
  eventos: Omit<Evento, "id">[];
  omitidos: number;
}

function desescapar(texto: string): string {
  return texto.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

/** Quita el "despliegue" de líneas: una línea que sigue empieza con un espacio o tabulador y continúa a la anterior. */
function desplegar(texto: string): string[] {
  const crudas = texto.split(/\r\n|\n|\r/);
  const lineas: string[] = [];
  for (const l of crudas) {
    if ((l.startsWith(" ") || l.startsWith("\t")) && lineas.length > 0) lineas[lineas.length - 1] += l.slice(1);
    else lineas.push(l);
  }
  return lineas;
}

/** Separa "NOMBRE;PARAM=X:valor" en su nombre y su valor (los parámetros no hacen falta aquí). */
function partirLinea(linea: string): { nombre: string; valor: string } | null {
  const i = linea.indexOf(":");
  if (i < 0) return null;
  return { nombre: linea.slice(0, i).split(";")[0]!.toUpperCase(), valor: linea.slice(i + 1) };
}

/** Interpreta un DTSTART (con o sin hora, con o sin VALUE=DATE) como {anio, mes, dia, hora}. */
function partirFecha(linea: string): { anio: number; mes: number; dia: number; hora: string | null } | null {
  const i = linea.indexOf(":");
  if (i < 0) return null;
  const valor = linea.slice(i + 1).trim();
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, anio, mes, dia, h, min] = m;
  return { anio: Number(anio), mes: Number(mes), dia: Number(dia), hora: h ? `${h}:${min}` : null };
}

/** Lee un .ics y separa lo que puede importarse en cumpleaños (eventos anuales) y eventos sueltos. */
export function parsearIcs(texto: string): ResultadoImportacion {
  const lineas = desplegar(texto);
  const amigos: Omit<Amigo, "id">[] = [];
  const eventos: Omit<Evento, "id">[] = [];
  let omitidos = 0;

  let enEvento = false;
  let resumen: string | null = null;
  let fecha: ReturnType<typeof partirFecha> | null = null;
  let repeticion: "no" | "anual" | "semanal" | "mensual" = "no";
  let nota = "";
  let categoria: CategoriaEvento = "otro";

  const cerrar = () => {
    if (!resumen || !fecha) {
      if (enEvento) omitidos++;
      return;
    }
    const colorAsignado = COLORES_AMIGO[(amigos.length + eventos.length) % COLORES_AMIGO.length]!.valor;
    if (repeticion === "anual") {
      const anioRazonable = fecha.anio >= 1900 && fecha.anio <= new Date().getFullYear() && fecha.anio !== 2000;
      amigos.push({
        nombre: resumen.replace(/^cumpleaños de /i, "").trim().slice(0, 40) || resumen,
        dia: fecha.dia,
        mes: fecha.mes,
        anio: anioRazonable ? fecha.anio : null,
        color: colorAsignado,
        nota,
        avisar: true,
      });
    } else {
      eventos.push({
        titulo: resumen.slice(0, 60),
        categoria,
        fecha: `${fecha.anio}-${String(fecha.mes).padStart(2, "0")}-${String(fecha.dia).padStart(2, "0")}`,
        hora: fecha.hora,
        color: categoria === "otro" ? colorAsignado : CATEGORIAS.find((c) => c.id === categoria)!.color,
        nota,
        avisar: true,
        repetir: repeticion === "semanal" || repeticion === "mensual" ? repeticion : "no",
      });
    }
  };

  for (const linea of lineas) {
    if (linea === "BEGIN:VEVENT") {
      enEvento = true;
      resumen = null;
      fecha = null;
      repeticion = "no";
      nota = "";
      categoria = "otro";
      continue;
    }
    if (linea === "END:VEVENT") {
      cerrar();
      enEvento = false;
      continue;
    }
    if (!enEvento) continue;
    const par = partirLinea(linea);
    if (!par) continue;
    if (par.nombre === "SUMMARY") resumen = desescapar(par.valor).trim();
    else if (par.nombre === "DESCRIPTION") nota = desescapar(par.valor).trim().slice(0, 200);
    else if (par.nombre === "CATEGORIES") {
      const c = par.valor.split(",")[0]!.trim().toLowerCase();
      categoria = esCategoria(c) ? c : "otro";
    } else if (par.nombre === "DTSTART") fecha = partirFecha(linea);
    else if (par.nombre === "RRULE") {
      if (/FREQ=YEARLY/i.test(par.valor)) repeticion = "anual";
      else if (/FREQ=WEEKLY/i.test(par.valor)) repeticion = "semanal";
      else if (/FREQ=MONTHLY/i.test(par.valor)) repeticion = "mensual";
    }
  }

  return { amigos, eventos, omitidos };
}
