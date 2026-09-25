import { esEscritorio } from "@/lib/entorno";

/**
 * «Mis tareas»: carpetas de verdad (una por materia) en Documentos/Nexo/Tareas. Todo el trabajo con el disco
 * lo hace la aplicación de escritorio (carpetas.rs); aquí solo se piden las cosas y se traducen los errores.
 */

export interface Carpeta {
  nombre: string;
  archivos: number;
  /** Segundos desde 1970 de lo último que se guardó ahí, si hay algo. */
  ultima: number | null;
}

export interface ArchivoCarpeta {
  nombre: string;
  bytes: number;
  /** Segundos desde 1970. */
  modificado: number;
}

export class ErrorCarpetas extends Error {}

export const carpetasDisponibles = (): boolean => esEscritorio();

async function pedir<T>(orden: string, args?: Record<string, unknown>): Promise<T> {
  if (!esEscritorio()) throw new ErrorCarpetas("Las carpetas de tareas solo están en la aplicación de escritorio.");
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    return await invoke<T>(orden, args);
  } catch (e) {
    throw new ErrorCarpetas(typeof e === "string" ? e : "No se pudo completar. Inténtalo de nuevo.");
  }
}

export const rutaBase = () => pedir<string>("carpetas_ruta");
export const listarCarpetas = () => pedir<Carpeta[]>("carpetas_listar");
export const crearCarpeta = (nombre: string) => pedir<string>("carpeta_crear", { nombre });
export const renombrarCarpeta = (actual: string, nuevo: string) => pedir<string>("carpeta_renombrar", { actual, nuevo });
export const borrarCarpeta = (nombre: string) => pedir<void>("carpeta_borrar", { nombre });
export const listarArchivos = (carpeta: string) => pedir<ArchivoCarpeta[]>("archivos_listar", { carpeta });
export const borrarArchivo = (carpeta: string, nombre: string) => pedir<void>("archivo_borrar", { carpeta, nombre });
export const renombrarArchivo = (carpeta: string, actual: string, nuevo: string) => pedir<string>("archivo_renombrar", { carpeta, actual, nuevo });
/** Con `pagina`, un PDF se abre justo en esa página. */
export const abrirEnSistema = (carpeta?: string, archivo?: string, pagina?: number) => pedir<void>("abrir_en_sistema", { carpeta: carpeta ?? null, archivo: archivo ?? null, pagina: pagina ?? null });

/** Guarda un archivo en una carpeta (nunca pisa otro con el mismo nombre). Devuelve el nombre con el que quedó. */
export async function guardarArchivo(carpeta: string, archivo: File): Promise<string> {
  if (!esEscritorio()) throw new ErrorCarpetas("Las carpetas de tareas solo están en la aplicación de escritorio.");
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    // El contenido viaja como cuerpo binario (rápido con PDF grandes); el nombre, en encabezados.
    return await invoke<string>("archivo_guardar", new Uint8Array(await archivo.arrayBuffer()), {
      headers: { "x-carpeta": encodeURIComponent(carpeta), "x-nombre": encodeURIComponent(archivo.name) },
    });
  } catch (e) {
    throw new ErrorCarpetas(typeof e === "string" ? e : "No se pudo guardar el archivo.");
  }
}

/** «1.2 MB», «340 KB»… */
export function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** Cómo se llamaría la carpeta de una materia (igual que la limpia el lado de Rust: sin caracteres que Windows no admite). */
export function nombreCarpetaDe(materia: string): string {
  return materia.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().replace(/\.+$/, "").slice(0, 60).trim();
}
