import type { NombreGlifo } from "@/lib/glifos";
import { T } from "@/lib/i18n";
import type { ToolId } from "@/types/documents";

/**
 * Tabla de rutas de Xook. La URL es la única fuente de verdad de "dónde estoy".
 * Los ID que no se pueden enumerar de antemano (canal, video, lista) viajan como parámetros
 * de consulta (?id=), porque la exportación estática no admite segmentos dinámicos abiertos.
 */

export type SeccionId = "inicio" | "video" | "musica" | "documentos" | "calendario" | "tareas" | "horario" | "calculadora" | "repaso" | "configuracion" | "atajos";

export interface Seccion {
  id: SeccionId;
  etiqueta: string;
  ruta: string;
  glifo: NombreGlifo;
  /** Atajo Ctrl+n; solo las secciones principales lo tienen. */
  atajo?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  /** Va abajo en la barra lateral, junto al perfil (Configuración y Atajos). */
  abajo?: boolean;
}

export const SECCIONES: readonly Seccion[] = [
  { id: "inicio", etiqueta: T("Inicio"), ruta: "/inicio", glifo: "inicio", atajo: "0" },
  { id: "video", etiqueta: T("Video"), ruta: "/video", glifo: "video", atajo: "1" },
  { id: "musica", etiqueta: T("Música"), ruta: "/musica", glifo: "musica", atajo: "2" },
  { id: "documentos", etiqueta: T("Documentos"), ruta: "/documentos", glifo: "documentos", atajo: "3" },
  { id: "calendario", etiqueta: T("Calendario"), ruta: "/calendario", glifo: "calendario", atajo: "4" },
  // Vive bajo /documentos (así lo tienen los enlaces y la última sesión guardada), pero es una sección propia de la barra.
  { id: "tareas", etiqueta: T("Mis tareas"), ruta: "/documentos/carpetas", glifo: "carpeta", atajo: "8" },
  { id: "horario", etiqueta: T("Horario"), ruta: "/horario", glifo: "reloj", atajo: "5" },
  { id: "calculadora", etiqueta: T("Calculadora"), ruta: "/calculadora", glifo: "calculadora", atajo: "6" },
  { id: "repaso", etiqueta: T("Repaso"), ruta: "/repaso", glifo: "repaso", atajo: "7" },
  { id: "configuracion", etiqueta: T("Configuración"), ruta: "/configuracion", glifo: "configuracion", abajo: true },
  { id: "atajos", etiqueta: T("Atajos de teclado"), ruta: "/atajos", glifo: "atajos", abajo: true },
];

export const SECCIONES_PRINCIPALES = SECCIONES.filter((s) => !s.abajo);
export const SECCIONES_INFERIORES = SECCIONES.filter((s) => s.abajo);

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
  "recover-pdf": "desbloquear-pdf",
  "compare-pdf": "comparar-pdf",
  organize: "organizar-paginas",
  watermark: "marca-de-agua",
  "page-numbers": "numerar-paginas",
  ocr: "ocr",
};

export const SLUGS = Object.values(SLUGS_HERRAMIENTA);

export function toolIdDeSlug(slug: string): ToolId | null {
  const e = (Object.entries(SLUGS_HERRAMIENTA) as [ToolId, string][]).find(([, s]) => s === slug);
  return e ? e[0] : null;
}

export const rutaHerramienta = (id: ToolId) => `/documentos/${SLUGS_HERRAMIENTA[id]}`;
export const rutaCanal = (id: string) => `/video/canal?id=${encodeURIComponent(id)}`;
export const rutaVer = (videoId: string) => `/video/ver?id=${encodeURIComponent(videoId)}`;
export const rutaArtista = (id: string) => `/musica/artista?id=${encodeURIComponent(id)}`;
export const rutaLista = (id: string, tipo: string = "playlist") => (tipo === "artist" ? rutaArtista(id) : `/musica/lista?id=${encodeURIComponent(id)}&tipo=${tipo}`);

/** Quita la barra final ("/video/" → "/video"), que añade trailingSlash. */
export function normalizarRuta(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** ¿Es una pantalla de Configuración? (con o sin categoría). */
export const esRutaDeAjustes = (ruta: string): boolean => /^\/configuracion\/?($|[?#])/.test(ruta);

export function seccionDe(pathname: string): SeccionId | null {
  const p = normalizarRuta(pathname);
  // Si dos secciones encajan («/documentos» y «/documentos/carpetas»), gana la más específica.
  const encajan = SECCIONES.filter((s) => p === s.ruta || p.startsWith(`${s.ruta}/`));
  return encajan.sort((a, b) => b.ruta.length - a.ruta.length)[0]?.id ?? null;
}

const FIJAS = new Set(["/inicio", "/video", "/video/canal", "/video/ver", "/musica", "/musica/lista", "/musica/artista", "/musica/biblioteca", "/musica/me-gusta", "/documentos", "/documentos/carpetas", "/calendario", "/horario", "/horario/anteriores", "/calculadora", "/repaso", "/configuracion", "/atajos"]);

/** ¿Existe esta ruta? Se usa antes de restaurar la última sesión: una ruta guardada puede haber dejado de existir. */
export function rutaValida(rutaConConsulta: string): boolean {
  const ruta = normalizarRuta(rutaConConsulta.split("?")[0]!.split("#")[0]!);
  if (FIJAS.has(ruta)) return true;
  const m = /^\/documentos\/([^/]+)$/.exec(ruta);
  return m ? SLUGS.includes(m[1]!) : false;
}

export const RUTA_INICIAL = "/inicio";
