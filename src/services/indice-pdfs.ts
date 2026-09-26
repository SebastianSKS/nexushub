import { create } from "zustand";
import { traducir } from "@/lib/i18n";
import { esEscritorio } from "@/lib/entorno";
import { plegar } from "@/lib/text";
import { abrirEnSistema } from "@/services/carpetas";
import { getPdfjs } from "@/services/documents/pdfjs";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCalendarioStore } from "@/store/calendario-store";

/**
 * Buscar DENTRO de los PDF de tus carpetas de materias (Documentos/Nexo/Tareas).
 *
 * Todo pasa en este equipo: la aplicación de escritorio entrega los PDF, pdf.js les saca el texto página por página y
 * ese texto se guarda en la base de datos del propio navegador de la ventana (IndexedDB). Nada se sube a internet.
 * Es solo un índice: si se borra, se vuelve a armar leyendo los archivos, que no se tocan nunca.
 * Cada vez solo se lee lo nuevo o lo que cambió (por fecha de modificación y tamaño).
 */

const VERSION_INDICE = 1;
const MAX_PAGINAS = 600;
const BD = "nexo-indice-pdfs";
const ALMACEN = "pdfs";
/** Menos texto que esto por página (en promedio) = un PDF escaneado, sin texto que buscar. */
const MIN_CARACTERES_POR_PAGINA = 15;

interface PdfEnDisco {
  carpeta: string;
  nombre: string;
  bytes: number;
  modificado: number;
}

interface Registro extends PdfEnDisco {
  clave: string;
  /** Texto de cada página (con los espacios ya juntados). */
  paginas: string[];
  /** No se pudo sacar texto: escaneado (solo imágenes) o con contraseña. */
  sinTexto: boolean;
  version: number;
}

/** Lo mismo, con el texto ya «plegado» (sin acentos ni mayúsculas) para comparar rápido. */
interface EnMemoria extends Registro {
  plegadas: string[];
  nombrePlegado: string;
}

const clave = (p: { carpeta: string; nombre: string }) => `${p.carpeta}/${p.nombre}`;

// ─── Estado visible (para la barra de búsqueda y Configuración) ────────────────────────────────────────────────────

interface EstadoIndice {
  /** «inactivo» = aún no se ha leído nada en esta sesión. */
  fase: "inactivo" | "leyendo" | "listo";
  hechos: number;
  total: number;
  /** Cuántos PDF hay indexados, cuántos con texto buscable y cuántas páginas. */
  pdfs: number;
  conTexto: number;
  paginas: number;
  /** Sube cada vez que el índice cambia: quien busca lo mira para volver a buscar con datos frescos. */
  version: number;
}

export const useIndicePdfs = create<EstadoIndice>(() => ({ fase: "inactivo", hechos: 0, total: 0, pdfs: 0, conTexto: 0, paginas: 0, version: 0 }));

const memoria = new Map<string, EnMemoria>();
let cargado: Promise<void> | null = null;
let enCurso: Promise<void> | null = null;
let ultimaSincronizacion = 0;
/** Sube al borrar el índice o apagar la función, para que una lectura a medias se detenga. */
let generacion = 0;
/** PDF que fallaron en esta sesión (con su fecha), para no reintentarlos una y otra vez. */
const fallidos = new Set<string>();

function publicar(parcial: Partial<EstadoIndice> = {}) {
  let conTexto = 0;
  let paginas = 0;
  for (const r of memoria.values()) {
    if (!r.sinTexto) {
      conTexto++;
      paginas += r.paginas.length;
    }
  }
  useIndicePdfs.setState((s) => ({ ...parcial, pdfs: memoria.size, conTexto, paginas, version: s.version + 1 }));
}

// ─── Base de datos del navegador (IndexedDB), con las fallas tratadas: si no hay, el índice vive solo en memoria ───

function abrirBd(): Promise<IDBDatabase | null> {
  return new Promise((resolver) => {
    try {
      const pet = indexedDB.open(BD, 1);
      pet.onupgradeneeded = () => pet.result.createObjectStore(ALMACEN, { keyPath: "clave" });
      pet.onsuccess = () => resolver(pet.result);
      pet.onerror = () => resolver(null);
    } catch {
      resolver(null);
    }
  });
}

async function transaccion<T>(modo: IDBTransactionMode, hacer: (a: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const bd = await abrirBd();
  if (!bd) return undefined;
  return new Promise((resolver) => {
    try {
      const tx = bd.transaction(ALMACEN, modo);
      const pet = hacer(tx.objectStore(ALMACEN));
      tx.oncomplete = () => {
        resolver(pet ? pet.result : undefined);
        bd.close();
      };
      tx.onerror = tx.onabort = () => {
        resolver(undefined);
        bd.close();
      };
    } catch {
      resolver(undefined);
      bd.close();
    }
  });
}

const guardarRegistro = (r: Registro) => transaccion("readwrite", (a) => void a.put(r));
const borrarRegistro = (c: string) => transaccion("readwrite", (a) => void a.delete(c));
const vaciarBd = () => transaccion("readwrite", (a) => void a.clear());
const leerRegistros = () => transaccion<Registro[]>("readonly", (a) => a.getAll());

function aMemoria(r: Registro): EnMemoria {
  return { ...r, plegadas: r.paginas.map(plegar), nombrePlegado: plegar(`${r.nombre} ${r.carpeta}`) };
}

/** Lee de la base de datos lo que ya se había indexado (una sola vez por sesión). */
export function cargarIndice(): Promise<void> {
  cargado ??= (async () => {
    const guardados = (await leerRegistros()) ?? [];
    for (const r of guardados) if (r.version === VERSION_INDICE) memoria.set(r.clave, aMemoria(r));
    publicar();
  })();
  return cargado;
}

// ─── Sacar el texto de un PDF ───────────────────────────────────────────────────────────────────────────────────────

/** Juntar espacios y saltos de línea: así los fragmentos se leen bien y las posiciones cuadran con el texto plegado. */
const limpiar = (t: string) => t.replace(/\s+/g, " ").trim();

async function leerPdf(p: PdfEnDisco): Promise<Registro> {
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = await invoke<ArrayBuffer>("archivo_leer", { carpeta: p.carpeta, nombre: p.nombre });
  const lib = await getPdfjs();
  const tarea = lib.getDocument({ data: new Uint8Array(bytes) });
  const base: Registro = { ...p, clave: clave(p), paginas: [], sinTexto: true, version: VERSION_INDICE };
  try {
    const doc = await tarea.promise;
    const paginas: string[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGINAS); n++) {
      const pagina = await doc.getPage(n);
      const contenido = await pagina.getTextContent();
      paginas.push(limpiar(contenido.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : "")).join("")));
      pagina.cleanup();
    }
    const letras = paginas.reduce((n, t) => n + t.length, 0);
    return letras / Math.max(1, paginas.length) < MIN_CARACTERES_POR_PAGINA ? base : { ...base, paginas, sinTexto: false };
  } catch (e) {
    // Con contraseña es un resultado seguro (no hay nada que leer); cualquier otra falla puede ser pasajera.
    if (e instanceof Error && e.name === "PasswordException") return base;
    throw e;
  } finally {
    await tarea.destroy();
  }
}

const respirar = () => new Promise<void>((r) => setTimeout(r, 0));
const activo = () => useAjustesStore.getState().buscarEnPdfs;

/**
 * Pone al día el índice con lo que hay en las carpetas: lee los PDF nuevos o cambiados y olvida los que ya no están.
 * Si ya hay una lectura en marcha, se une a ella. `esperaMs`: no repetir si se hizo hace menos que eso.
 */
export function sincronizarIndice(esperaMs = 0): Promise<void> {
  if (!esEscritorio() || !activo()) return Promise.resolve();
  if (enCurso) return enCurso;
  if (esperaMs > 0 && Date.now() - ultimaSincronizacion < esperaMs) return Promise.resolve();
  const miGeneracion = generacion;
  enCurso = (async () => {
    try {
      await cargarIndice();
      const { invoke } = await import("@tauri-apps/api/core");
      const disco = await invoke<PdfEnDisco[]>("pdfs_listar");
      if (miGeneracion !== generacion) return;

      const enDisco = new Set(disco.map(clave));
      for (const c of [...memoria.keys()]) {
        if (!enDisco.has(c)) {
          memoria.delete(c);
          void borrarRegistro(c);
        }
      }
      const pendientes = disco.filter((p) => {
        const r = memoria.get(clave(p));
        return (!r || r.modificado !== p.modificado || r.bytes !== p.bytes) && !fallidos.has(`${clave(p)}@${p.modificado}`);
      });
      publicar({ fase: pendientes.length > 0 ? "leyendo" : "listo", hechos: 0, total: pendientes.length });

      let hechos = 0;
      for (const p of pendientes) {
        if (miGeneracion !== generacion) return;
        try {
          const r = await leerPdf(p);
          if (miGeneracion !== generacion) return;
          memoria.set(r.clave, aMemoria(r));
          void guardarRegistro(r);
        } catch {
          fallidos.add(`${clave(p)}@${p.modificado}`);
        }
        hechos++;
        // Se avisa de a poco: cada PDF nuevo ya se puede buscar sin esperar a que termine todo.
        publicar({ hechos });
        await respirar();
      }
      publicar({ fase: "listo", hechos: pendientes.length, total: pendientes.length });
    } catch {
      publicar({ fase: "listo" });
    } finally {
      ultimaSincronizacion = Date.now();
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Olvida todo el índice (al apagar la función o desde Configuración). Los PDF no se tocan. */
export async function borrarIndice(): Promise<void> {
  generacion++;
  memoria.clear();
  fallidos.clear();
  cargado = Promise.resolve();
  ultimaSincronizacion = 0;
  await vaciarBd();
  publicar({ fase: "inactivo", hechos: 0, total: 0 });
}

// ─── Buscar ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface CoincidenciaPdf {
  carpeta: string;
  nombre: string;
  /** La mejor página (la que más veces nombra lo buscado). */
  pagina: number;
  /** Cuántas páginas del archivo lo nombran. */
  paginasConCoincidencia: number;
  /** Un trozo de esa página alrededor de lo encontrado, con el texto original. */
  fragmento: string;
  /** Lo buscado aparece en el nombre del archivo o de su carpeta. */
  enElNombre: boolean;
  puntaje: number;
}

const ANTES = 45;
const DESPUES = 130;

function cuantas(texto: string, termino: string, tope: number): number {
  let n = 0;
  for (let i = texto.indexOf(termino); i !== -1 && n < tope; i = texto.indexOf(termino, i + termino.length)) n++;
  return n;
}

/** Recorta sin partir palabras a la mitad. */
function fragmentoDe(original: string, pos: number): string {
  let ini = Math.max(0, pos - ANTES);
  let fin = Math.min(original.length, pos + DESPUES);
  if (ini > 0) {
    const sp = original.indexOf(" ", ini);
    if (sp !== -1 && sp < pos) ini = sp + 1;
  }
  if (fin < original.length) {
    const sp = original.lastIndexOf(" ", fin);
    if (sp > pos) fin = sp;
  }
  return `${ini > 0 ? "…" : ""}${original.slice(ini, fin)}${fin < original.length ? "…" : ""}`;
}

/**
 * Los PDF con lo buscado, los mejores primero. `terminos` ya vienen sin acentos ni mayúsculas.
 * Una página cuenta cuando tiene TODAS las palabras; un archivo también cuenta si están todas en su nombre.
 */
export function buscarEnPdfs(terminos: string[]): CoincidenciaPdf[] {
  if (memoria.size === 0 || terminos.length === 0) return [];
  const t = terminos.map(plegar);
  const salida: CoincidenciaPdf[] = [];
  for (const r of memoria.values()) {
    const enElNombre = t.every((x) => r.nombrePlegado.includes(x));
    let mejor = -1;
    let mejorPuntaje = 0;
    let paginas = 0;
    if (!r.sinTexto) {
      r.plegadas.forEach((texto, i) => {
        if (!t.every((x) => texto.includes(x))) return;
        paginas++;
        const puntaje = t.reduce((n, x) => n + cuantas(texto, x, 20), 0);
        if (puntaje > mejorPuntaje) {
          mejorPuntaje = puntaje;
          mejor = i;
        }
      });
    }
    if (mejor === -1 && !enElNombre) continue;
    const pagina = Math.max(0, mejor);
    const pos = mejor === -1 ? 0 : r.plegadas[pagina].indexOf(t[0]);
    salida.push({
      carpeta: r.carpeta,
      nombre: r.nombre,
      pagina: pagina + 1,
      paginasConCoincidencia: paginas,
      fragmento: mejor === -1 ? "" : fragmentoDe(r.paginas[pagina], Math.max(0, pos)),
      enElNombre,
      puntaje: mejorPuntaje + (enElNombre ? 1000 : 0),
    });
  }
  return salida.sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre));
}

/** Abre el PDF en la página donde apareció lo buscado (sin página, con el programa de siempre). Si el archivo ya no está, lo dice y lo saca del índice. */
export async function abrirPdfEnPagina(c: { carpeta: string; nombre: string; pagina?: number }): Promise<void> {
  try {
    await abrirEnSistema(c.carpeta, c.nombre, c.pagina);
  } catch {
    useCalendarioStore.getState().mostrarAviso({ titulo: traducir("No se pudo abrir el PDF"), texto: traducir("«{nombre}» ya no está en la carpeta {carpeta}.", { nombre: c.nombre, carpeta: c.carpeta }), destino: null, autocerrar: 4000 });
    void sincronizarIndice();
  }
}
