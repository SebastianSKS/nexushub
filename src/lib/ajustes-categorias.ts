import { T } from "./i18n/nucleo.ts";
import type { NombreGlifo } from "./glifos.ts";
import { normalize } from "./text.ts";

/**
 * Cómo se ordena Configuración (por categorías, como la de Windows; salen en la barra lateral) y qué se puede encontrar en ella desde el buscador.
 * La pantalla y el buscador leen de aquí. Al añadir un ajuste, ponlo en su categoría y en `AJUSTES` (con las palabras
 * con las que alguien lo buscaría, en español y en inglés) y envuélvelo en la pantalla con `<Ancla id="…">`.
 */

export type CategoriaId = "perfil" | "apariencia" | "idioma" | "avisos" | "reproduccion" | "documentos" | "sistema" | "datos" | "acerca";

export interface Categoria {
  id: CategoriaId;
  titulo: string;
  descripcion: string;
  glifo: NombreGlifo;
  claves: string;
}

export const CATEGORIAS: readonly Categoria[] = [
  { id: "perfil", titulo: T("Perfil"), descripcion: T("Tu nombre y tu foto"), glifo: "persona", claves: "cuenta usuario account profile" },
  { id: "apariencia", titulo: T("Apariencia"), descripcion: T("Tema, color, tamaño y animaciones"), glifo: "paleta", claves: "personalizar diseño appearance personalization look" },
  { id: "idioma", titulo: T("Idioma y hora"), descripcion: T("Idioma, formato de hora y semana"), glifo: "reloj", claves: "region language time" },
  { id: "avisos", titulo: T("Avisos"), descripcion: T("Clases, eventos, sonido y no molestar"), glifo: "campana", claves: "notificaciones alertas notifications alerts reminders" },
  { id: "reproduccion", titulo: T("Música y video"), descripcion: T("Volumen, reproducción y canales"), glifo: "musica", claves: "reproduccion spotify youtube playback music video" },
  { id: "documentos", titulo: T("Documentos"), descripcion: T("Conversiones, guardado y búsqueda en archivos"), glifo: "documentos", claves: "archivos pdf documents files" },
  { id: "sistema", titulo: T("Sistema"), descripcion: T("Arranque, bandeja y rendimiento"), glifo: "pantalla", claves: "aplicacion windows system startup" },
  { id: "datos", titulo: T("Copia y restablecer"), descripcion: T("Copia de seguridad y valores de fábrica"), glifo: "descargar", claves: "datos respaldo backup data reset" },
  { id: "acerca", titulo: T("Ayuda y acerca de"), descripcion: T("Ayuda, guías, actualizaciones y versión"), glifo: "informacion", claves: "soporte about help version" },
];

export interface AjusteBuscable {
  /** El mismo de su `<Ancla>` en la pantalla. */
  id: string;
  categoria: CategoriaId;
  titulo: string;
  claves: string;
  /** Solo existe en la aplicación de escritorio. */
  escritorio?: boolean;
}

export const AJUSTES: readonly AjusteBuscable[] = [
  { id: "perfil", categoria: "perfil", titulo: T("Nombre y foto"), claves: "avatar sesion editar name photo picture sign in" },

  { id: "tema", categoria: "apariencia", titulo: T("Tema"), claves: "claro oscuro modo noche dark light mode theme" },
  { id: "acento", categoria: "apariencia", titulo: T("Color de acento"), claves: "colores botones accent color" },
  { id: "fondo-musical", categoria: "apariencia", titulo: T("Fondo según la música"), claves: "colores portada caratula animado movimiento cancion spotify music background colors animated" },
  { id: "tamano", categoria: "apariencia", titulo: T("Tamaño de la interfaz"), claves: "zoom letra texto grande chico escala size scale font", escritorio: true },
  { id: "animaciones", categoria: "apariencia", titulo: T("Animaciones"), claves: "movimiento transiciones animations motion" },
  { id: "barra-lateral", categoria: "apariencia", titulo: T("Secciones de la barra lateral"), claves: "menu ocultar mostrar sidebar hide sections" },
  { id: "efecto", categoria: "apariencia", titulo: T("Efecto de ventana"), claves: "mica acrilico fondo transparencia window effect background" },

  { id: "idioma", categoria: "idioma", titulo: T("Idioma"), claves: "ingles español language english spanish" },
  { id: "formato-hora", categoria: "idioma", titulo: T("Formato de hora"), claves: "12 24 horas reloj time format clock" },
  { id: "inicio-semana", categoria: "idioma", titulo: T("La semana empieza el"), claves: "primer dia lunes domingo calendario week starts monday sunday" },

  { id: "aviso-clase", categoria: "avisos", titulo: T("Avisar antes de cada clase"), claves: "notificacion horario recordatorio class reminder notification" },
  { id: "aviso-evento", categoria: "avisos", titulo: T("Avisar antes de un evento con hora"), claves: "notificacion examen cita tarea recordatorio event reminder" },
  { id: "resumen-dia", categoria: "avisos", titulo: T("Resumen del día"), claves: "notificacion mañana daily summary" },
  { id: "sonido", categoria: "avisos", titulo: T("Sonido de los avisos"), claves: "tono audio notificacion sound tone" },
  { id: "no-molestar", categoria: "avisos", titulo: T("No molestar"), claves: "silencio silenciar callar horas do not disturb quiet mute" },
  { id: "aviso-cancion", categoria: "avisos", titulo: T("Avisar qué canción suena"), claves: "notificacion musica song notification" },
  { id: "cumpleanos", categoria: "avisos", titulo: T("Avisos de cumpleaños"), claves: "notificacion birthday" },
  { id: "probar-aviso", categoria: "avisos", titulo: T("Probar una notificación"), claves: "prueba test notification" },

  { id: "volumen", categoria: "reproduccion", titulo: T("Volumen predeterminado"), claves: "sonido audio volume" },
  { id: "autoplay", categoria: "reproduccion", titulo: T("Reproducción automática"), claves: "video autoplay" },
  { id: "similares", categoria: "reproduccion", titulo: T("Música sin parar (como Spotify)"), claves: "spotify canciones parecidas autoplay similar songs" },
  { id: "canales", categoria: "reproduccion", titulo: T("Canales de YouTube"), claves: "exportar importar restaurar youtube channels" },

  { id: "office", categoria: "documentos", titulo: T("Convertir con el programa de office"), claves: "word excel powerpoint libreoffice conversion pdf convert", escritorio: true },
  { id: "buscar-en-archivos", categoria: "documentos", titulo: T("Buscar dentro de mis archivos"), claves: "pdf indice texto search inside files", escritorio: true },
  { id: "donde-guardar", categoria: "documentos", titulo: T("Elegir dónde guardar"), claves: "descargas carpeta guardar como save folder downloads", escritorio: true },
  { id: "al-terminar", categoria: "documentos", titulo: T("Al terminar una conversión"), claves: "descargar solo conversion finish download" },

  { id: "pantalla-inicial", categoria: "sistema", titulo: T("Al abrir Xook, mostrar"), claves: "pantalla de inicio arranque seccion inicial start screen" },
  { id: "inicio-windows", categoria: "sistema", titulo: T("Iniciar con Windows"), claves: "arranque automatico encender startup launch boot", escritorio: true },
  { id: "bandeja", categoria: "sistema", titulo: T("Seguir sonando en la bandeja"), claves: "segundo plano cerrar minimizar tray background close", escritorio: true },
  { id: "bajo-consumo", categoria: "sistema", titulo: T("Modo de bajo consumo"), claves: "rendimiento bateria lento memoria performance battery low power" },

  { id: "guardar-copia", categoria: "datos", titulo: T("Guardar una copia de seguridad"), claves: "respaldo exportar backup export" },
  { id: "restaurar-copia", categoria: "datos", titulo: T("Restaurar desde una copia"), claves: "respaldo importar recuperar restore import backup" },
  { id: "restablecer", categoria: "datos", titulo: T("Restablecer valores"), claves: "fabrica reiniciar ajustes reset defaults factory" },

  { id: "ayuda", categoria: "acerca", titulo: T("¿Algo no funciona?"), claves: "ayuda soporte problema error reportar help support problem bug" },
  { id: "primeros-pasos", categoria: "acerca", titulo: T("Primeros pasos"), claves: "tutorial empezar getting started" },
  { id: "consejos", categoria: "acerca", titulo: T("Consejos al empezar"), claves: "tips" },
  { id: "bienvenida", categoria: "acerca", titulo: T("Bienvenida y guías"), claves: "tutorial como funciona welcome guides" },
  { id: "actualizaciones", categoria: "acerca", titulo: T("Actualizaciones"), claves: "actualizar nueva version update updates", escritorio: true },
  { id: "novedades", categoria: "acerca", titulo: T("Novedades"), claves: "cambios que hay de nuevo what's new changelog", escritorio: true },
  { id: "acerca-de", categoria: "acerca", titulo: T("Acerca de Xook"), claves: "version privacidad datos about privacy" },
];

export const categoriaDe = (id: string | null | undefined): Categoria | null => CATEGORIAS.find((c) => c.id === id) ?? null;

/** La categoría que se muestra: la de la dirección o, si no dice (o no existe), Apariencia. */
export const categoriaActiva = (id: string | null | undefined): Categoria => categoriaDe(id) ?? categoriaDe("apariencia")!;

export const rutaAjustes = (categoria: CategoriaId, ajuste?: string): string => `/configuracion?categoria=${categoria}${ajuste ? `&ajuste=${ajuste}` : ""}`;

export type HallazgoAjuste = { tipo: "categoria"; categoria: Categoria } | { tipo: "ajuste"; ajuste: AjusteBuscable; categoria: Categoria };

/** Cada palabra escrita tiene que ser el comienzo de alguna palabra del texto (así «hora» no encuentra «ahora»). */
function coincide(terminos: string[], textos: string[]): boolean {
  const palabras = normalize(textos.join(" ")).split(/[^a-z0-9ñ]+/).filter(Boolean);
  return terminos.every((t) => palabras.some((p) => p.startsWith(t)));
}

/**
 * Las categorías y los ajustes que encajan con lo escrito (primero las categorías). Una categoría solo sale por su
 * propio nombre: buscar «apariencia» lleva a Apariencia, no a una lista de todo lo que hay dentro.
 */
export function buscarAjustes(texto: string, traducirTexto: (clave: string) => string, escritorio: boolean): HallazgoAjuste[] {
  const terminos = normalize(texto).split(/[^a-z0-9ñ]+/).filter(Boolean);
  if (terminos.join("").length < 2) return [];
  const empieza = (titulo: string) => Number(!normalize(traducirTexto(titulo)).startsWith(normalize(texto.trim())));
  const categorias = CATEGORIAS.filter((c) => coincide(terminos, [c.titulo, traducirTexto(c.titulo), c.claves]));
  const ajustes = AJUSTES.filter((a) => (escritorio || !a.escritorio) && coincide(terminos, [a.titulo, traducirTexto(a.titulo), a.claves])).sort((a, b) => empieza(a.titulo) - empieza(b.titulo));
  return [
    ...categorias.map((categoria): HallazgoAjuste => ({ tipo: "categoria", categoria })),
    ...ajustes.map((ajuste): HallazgoAjuste => ({ tipo: "ajuste", ajuste, categoria: categoriaDe(ajuste.categoria)! })),
  ];
}
