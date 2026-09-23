import type { NombreGlifo } from "@/lib/glifos";
import type { ToolId } from "@/types/documents";

/**
 * Tabla de rutas de NexusHub. La URL es la única fuente de verdad de "dónde estoy".
 * Los ID que no se pueden enumerar de antemano (canal, video, lista) viajan como parámetros
 * de consulta (?id=), porque la exportación estática no admite segmentos dinámicos abiertos.
 */

export type SeccionId = "inicio" | "video" | "musica" | "documentos" | "calendario" | "configuracion" | "atajos";

export interface Seccion {
  id: SeccionId;
  etiqueta: string;
  ruta: string;
  glifo: NombreGlifo;
  /** Atajo Ctrl+n; solo las secciones principales lo tienen. */
  atajo?: "0" | "1" | "2" | "3" | "4";
}

export const SECCIONES: readonly Seccion[] = [
  { id: "inicio", etiqueta: "Inicio", ruta: "/inicio", glifo: "inicio", atajo: "0" },
  { id: "video", etiqueta: "Video", ruta: "/video", glifo: "video", atajo: "1" },
  { id: "musica", etiqueta: "Música", ruta: "/musica", glifo: "musica", atajo: "2" },
  { id: "documentos", etiqueta: "Documentos", ruta: "/documentos", glifo: "documentos", atajo: "3" },
  { id: "calendario", etiqueta: "Calendario", ruta: "/calendario", glifo: "calendario", atajo: "4" },
  { id: "configuracion", etiqueta: "Configuración", ruta: "/configuracion", glifo: "configuracion" },
  { id: "atajos", etiqueta: "Atajos de teclado", ruta: "/atajos", glifo: "atajos" },
];

export const SECCIONES_PRINCIPALES = SECCIONES.filter((s) => s.atajo);
export const SECCIONES_INFERIORES = SECCIONES.filter((s) => !s.atajo);

/** Herramientas de Documentos: ToolId ↔ segmento de la URL (/documentos/unir-pdf). */
export const SLUGS_HERRAMIENTA: Record<ToolId, string> = {
  "word-to-pdf": "word-a-pdf",
  "pdf-to-word": "pdf-a-word",
  "excel-to-pdf": "excel-a-pdf",
  "powerpoint-to-pdf": "powerpoint-a-pdf",
  merge: "unir-pdf",
  split: "dividir-pdf",
  compress: "comprimir-pdf",
  "images-to-pdf": "imagenes-a-pdf",
  "pdf-to-images": "pdf-a-imagenes",
  rotate: "rotar-paginas",
  "protect-pdf": "proteger-pdf",
  "unlock-pdf": "quitar-contrasena",
  "compare-pdf": "comparar-pdf",
};

export const SLUGS = Object.values(SLUGS_HERRAMIENTA);

export function toolIdDeSlug(slug: string): ToolId | null {
  const e = (Object.entries(SLUGS_HERRAMIENTA) as [ToolId, string][]).find(([, s]) => s === slug);
  return e ? e[0] : null;
}

export const rutaHerramienta = (id: ToolId) => `/documentos/${SLUGS_HERRAMIENTA[id]}`;
export const rutaCanal = (id: string) => `/video/canal?id=${encodeURIComponent(id)}`;
export const rutaVer = (videoId: string) => `/video/ver?id=${encodeURIComponent(videoId)}`;
export const rutaLista = (id: string, tipo: string = "playlist") => `/musica/lista?id=${encodeURIComponent(id)}&tipo=${tipo}`;

/** Quita la barra final ("/video/" → "/video"), que añade trailingSlash. */
export function normalizarRuta(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function seccionDe(pathname: string): SeccionId | null {
  const p = normalizarRuta(pathname);
  return SECCIONES.find((s) => p === s.ruta || p.startsWith(`${s.ruta}/`))?.id ?? null;
}

const FIJAS = new Set(["/inicio", "/video", "/video/canal", "/video/ver", "/musica", "/musica/lista", "/documentos", "/calendario", "/configuracion", "/atajos"]);

/** ¿Existe esta ruta? Se usa antes de restaurar la última sesión: una ruta guardada puede haber dejado de existir. */
export function rutaValida(rutaConConsulta: string): boolean {
  const ruta = normalizarRuta(rutaConConsulta.split("?")[0]!.split("#")[0]!);
  if (FIJAS.has(ruta)) return true;
  const m = /^\/documentos\/([^/]+)$/.exec(ruta);
  return m ? SLUGS.includes(m[1]!) : false;
}

export const RUTA_INICIAL = "/inicio";
