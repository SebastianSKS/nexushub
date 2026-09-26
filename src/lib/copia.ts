/**
 * La copia de seguridad de Nexo: un archivo con tus ajustes, perfil, horario, calendario, canales, favoritos y notas, para
 * llevarlos a otra computadora o volver atrás si algo sale mal. Es lógica pura (sin pantalla) para poder probarla bien: lo
 * que entra en una copia, cómo se valida un archivo que llega de fuera y cómo se aplica.
 *
 * Nunca lleva las credenciales de Spotify (ni nada temporal): se puede compartir el archivo sin regalar tu cuenta.
 */

import { T } from "./i18n/nucleo.ts";

export const PREFIJO_DATOS = "nexushub-";
export const VERSION_COPIA = 1;
/** Tope de tamaño de un archivo de copia al leerlo (los datos de Nexo pesan unos pocos KB; esto es de sobra). */
export const MAX_BYTES_COPIA = 3 * 1024 * 1024;
const MAX_BYTES_VALOR = 1_500_000;

/** Lo que NO entra en una copia: credenciales, restos de un inicio de sesión a medias y cosas de esta sesión. */
export const CLAVES_EXCLUIDAS: readonly string[] = [
  "nexushub-spotify-tokens",
  "nexushub-spotify-pkce",
  "nexushub-spotify-volver",
  "nexushub-spotify-cerrada",
  "nexushub-sesion-cerrada",
  "nexushub-ultima-ruta",
  "nexushub-version-vista",
];

export interface CopiaDatos {
  app: "Nexo";
  tipo: "copia-de-seguridad";
  version: number;
  creada: string;
  /** La versión de Nexo con la que se hizo (solo informativa). */
  appVersion: string;
  datos: Record<string, string>;
}

export const esClaveDeCopia = (clave: string): boolean => clave.startsWith(PREFIJO_DATOS) && !CLAVES_EXCLUIDAS.includes(clave);

/** Lo mínimo que se necesita de `localStorage` (para poder probar sin navegador). */
export interface Almacen {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

/** Arma la copia con todo lo que hay guardado y se puede copiar. */
export function crearCopia(almacen: Almacen, appVersion: string, ahora: Date = new Date()): CopiaDatos {
  const datos: Record<string, string> = {};
  for (let i = 0; i < almacen.length; i++) {
    const k = almacen.key(i);
    if (!k || !esClaveDeCopia(k)) continue;
    const v = almacen.getItem(k);
    if (v !== null) datos[k] = v;
  }
  return { app: "Nexo", tipo: "copia-de-seguridad", version: VERSION_COPIA, creada: ahora.toISOString(), appVersion, datos };
}

export type ResultadoLectura = { ok: true; copia: CopiaDatos; ignoradas: number } | { ok: false; motivo: string };

/** Lee un archivo de copia que llega de fuera: si no es de Nexo o está mal, dice por qué; si sirve, deja solo lo permitido. */
export function leerCopia(texto: string): ResultadoLectura {
  if (texto.length > MAX_BYTES_COPIA) return { ok: false, motivo: T("El archivo es demasiado grande para ser una copia de Nexo.") };
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: T("El archivo no se puede leer: no es una copia de Nexo.") };
  }
  if (!crudo || typeof crudo !== "object") return { ok: false, motivo: T("El archivo no es una copia de Nexo.") };
  const c = crudo as Record<string, unknown>;
  if (c.app !== "Nexo" || c.tipo !== "copia-de-seguridad") return { ok: false, motivo: T("El archivo no es una copia de Nexo.") };
  if (typeof c.version !== "number" || !Number.isInteger(c.version) || c.version < 1) return { ok: false, motivo: T("El archivo no dice de qué versión es.") };
  if (c.version > VERSION_COPIA) return { ok: false, motivo: T("La copia es de una versión más nueva de Nexo. Actualiza Nexo y vuelve a intentarlo.") };
  if (!c.datos || typeof c.datos !== "object" || Array.isArray(c.datos)) return { ok: false, motivo: T("La copia no trae datos.") };

  const datos: Record<string, string> = {};
  let ignoradas = 0;
  for (const [k, v] of Object.entries(c.datos as Record<string, unknown>)) {
    if (typeof v !== "string" || v.length > MAX_BYTES_VALOR || !esClaveDeCopia(k)) {
      ignoradas++;
      continue;
    }
    datos[k] = v;
  }
  if (Object.keys(datos).length === 0) return { ok: false, motivo: T("La copia está vacía.") };
  return {
    ok: true,
    ignoradas,
    copia: { app: "Nexo", tipo: "copia-de-seguridad", version: c.version, creada: typeof c.creada === "string" ? c.creada : "", appVersion: typeof c.appVersion === "string" ? c.appVersion : "", datos },
  };
}

/** Cuántas cosas trae cada parte de la copia, para enseñárselo a quien va a restaurar («12 eventos, 8 clases…»). */
export interface ResumenCopia {
  eventos: number;
  clases: number;
  canales: number;
  cumpleanos: number;
  notas: number;
  favoritos: number;
  tienePerfil: boolean;
}

function contar(v: string | undefined): number {
  if (!v) return 0;
  try {
    const x = JSON.parse(v) as unknown;
    return Array.isArray(x) ? x.length : 0;
  } catch {
    return 0;
  }
}

export function resumirCopia(c: CopiaDatos): ResumenCopia {
  const d = c.datos;
  return {
    eventos: contar(d["nexushub-eventos"]),
    clases: contar(d["nexushub-horario"]),
    canales: contar(d["nexushub-canales"]),
    cumpleanos: contar(d["nexushub-cumples"]),
    notas: contar(d["nexushub-notas"]),
    favoritos: contar(d["nexushub-musica-favoritos"]),
    tienePerfil: Boolean(d["nexushub-perfil"]),
  };
}

/** El nombre del archivo: «Nexo-copia-2026-09-26.json». */
export function nombreDeCopia(ahora: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `Nexo-copia-${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}.json`;
}

/** Escribe la copia en el almacén: lo que trae reemplaza a lo que hay; lo que la copia no trae se queda como está. Devuelve cuántas claves puso. */
export function aplicarCopia(copia: CopiaDatos, almacen: Pick<Almacen, "setItem">): number {
  let n = 0;
  for (const [k, v] of Object.entries(copia.datos)) {
    if (!esClaveDeCopia(k)) continue;
    almacen.setItem(k, v);
    n++;
  }
  return n;
}
