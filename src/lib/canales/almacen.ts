import type { AlmacenCanales, Canal, TipoCanal } from "@/types/canal";
import { traducir } from "@/lib/i18n";
import { HOSTS_AVATAR, ID_CANAL, ID_LISTA } from "./ids";

const CLAVE_CANALES = "nexushub-canales";
const CLAVE_DURACIONES = "nexushub-duraciones";
const MAX_CANALES = 40;
const MAX_DURACIONES = 3000;

/**
 * localStorage lanza excepciones en modo incógnito o con el almacenamiento bloqueado.
 * Cada lectura y escritura va envuelta: si falla, la aplicación sigue con la sesión en memoria.
 */
function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string): boolean {
  try {
    window.localStorage.setItem(clave, valor);
    return true;
  } catch {
    return false;
  }
}

// --- Validación (compartida por lo guardado y por la importación) ----------------------------

function limpiarCanal(x: unknown): Canal | null {
  if (typeof x !== "object" || x === null) return null;
  const c = x as Record<string, unknown>;
  const tipo: TipoCanal = c.tipo === "lista" ? "lista" : "canal";
  if (typeof c.id !== "string") return null;
  if (!(tipo === "canal" ? ID_CANAL : ID_LISTA).test(c.id)) return null;
  // eslint-disable-next-line no-control-regex
  const nombre = typeof c.nombre === "string" ? c.nombre.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200) : "";
  if (!nombre) return null;
  const avatar = typeof c.avatar === "string" && HOSTS_AVATAR.test(c.avatar) ? c.avatar : null;
  const agregadoEn = typeof c.agregadoEn === "string" && !Number.isNaN(Date.parse(c.agregadoEn)) ? c.agregadoEn : new Date().toISOString();
  return { id: c.id, nombre, avatar, tipo, agregadoEn, ...(c.sugerido === true ? { sugerido: true } : {}) };
}

function limpiarLista(lista: unknown): Canal[] {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set<string>();
  const salida: Canal[] = [];
  for (const item of lista) {
    const c = limpiarCanal(item);
    if (c && !vistos.has(c.id)) {
      vistos.add(c.id);
      salida.push(c);
    }
    if (salida.length >= MAX_CANALES) break;
  }
  return salida;
}

// --- Canales ---------------------------------------------------------------------------------

/** Canales guardados, o null si no hay nada guardado (o está dañado). */
export function leerCanales(): Canal[] | null {
  const crudo = leer(CLAVE_CANALES);
  if (!crudo) return null;
  try {
    const datos = JSON.parse(crudo) as Partial<AlmacenCanales>;
    if (datos.version !== 1) return null;
    return limpiarLista(datos.canales);
  } catch {
    return null; // JSON dañado: se ignora en vez de romper la app
  }
}

export function guardarCanales(canales: Canal[]): boolean {
  const almacen: AlmacenCanales = { version: 1, canales };
  return escribir(CLAVE_CANALES, JSON.stringify(almacen));
}

// --- Duraciones (el feed no las trae: se aprenden con player.getDuration()) ------------------

export function leerDuraciones(): Record<string, number> {
  const crudo = leer(CLAVE_DURACIONES);
  if (!crudo) return {};
  try {
    const datos = JSON.parse(crudo) as Record<string, unknown>;
    const salida: Record<string, number> = {};
    for (const [k, v] of Object.entries(datos)) {
      if (typeof v === "number" && v > 0 && v < 86400 * 2) salida[k] = v;
    }
    return salida;
  } catch {
    return {};
  }
}

export function guardarDuraciones(duraciones: Record<string, number>): void {
  const claves = Object.keys(duraciones);
  let datos = duraciones;
  if (claves.length > MAX_DURACIONES) {
    // Se conservan las más recientes (el orden de inserción se mantiene).
    datos = Object.fromEntries(Object.entries(duraciones).slice(-MAX_DURACIONES));
  }
  escribir(CLAVE_DURACIONES, JSON.stringify(datos));
}

// --- Exportar / importar ---------------------------------------------------------------------

export function serializarExportacion(canales: Canal[]): string {
  const almacen: AlmacenCanales = { version: 1, canales };
  return JSON.stringify(almacen, null, 2);
}

export function interpretarImportacion(texto: string): { canales: Canal[]; invalidos: number } | { error: string } {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { error: traducir("Ese archivo no es un JSON válido. Usa un archivo creado con «Exportar mis canales».") };
  }
  const almacen = datos as Partial<AlmacenCanales> | null;
  if (!almacen || almacen.version !== 1 || !Array.isArray(almacen.canales)) {
    return { error: traducir("Ese archivo no tiene el formato de Nexo. Usa un archivo creado con «Exportar mis canales».") };
  }
  const limpios = limpiarLista(almacen.canales);
  if (limpios.length === 0) return { error: traducir("El archivo no contiene ningún canal válido.") };
  // Lo importado es una elección explícita de quien reparte la lista: nunca llega marcado como «sugerido».
  const canales = limpios.map(({ sugerido: _s, ...resto }) => resto);
  return { canales, invalidos: almacen.canales.length - limpios.length };
}
