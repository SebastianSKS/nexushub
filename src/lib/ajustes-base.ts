import type { PreferenciaIdioma } from "./i18n/nucleo.ts";
import { esSonidoAviso, SONIDO_PREDETERMINADO, VOLUMEN_AVISOS_PREDETERMINADO, type SonidoAviso } from "./sonidos.ts";
import { horaValida, SILENCIO_PREDETERMINADO } from "./silencio.ts";

/**
 * Los ajustes de Nexo, su valor de fábrica y —lo más importante— cómo se leen de lo guardado: cada campo se comprueba
 * y, si viene roto o de una versión vieja, se usa el valor de fábrica. Así un archivo dañado nunca deja la aplicación sin
 * abrir. Es lógica pura (sin pantalla) para poder probarla. El almacén que la usa está en `store/ajustes-store.ts`.
 */

export type PreferenciaTema = "claro" | "oscuro" | "sistema";
export type EfectoVentana = "mica" | "acrilico" | "ninguno";
export type AlTerminar = "nada" | "descargar" | "abrir-carpeta";
/** Con qué pantalla se abre Nexo: la última que se estaba usando, o una sección fija. */
export type SeccionInicial = "inicio" | "ultima" | "video" | "musica" | "documentos" | "calendario";
/** Cómo se escriben las horas: 24 horas (14:30) o 12 con a. m./p. m. (2:30 p. m.). */
export type FormatoHora = "24h" | "12h";
/** Con qué día empieza la semana en el calendario. */
export type PrimerDiaSemana = "lunes" | "domingo";
/** Si se reducen las animaciones: siguiendo a Windows, siempre o nunca. */
export type ReducirMovimiento = "sistema" | "si" | "no";

/** Las secciones de la barra lateral que se pueden esconder (Inicio y Configuración siempre están). */
export const SECCIONES_OCULTABLES = ["video", "musica", "documentos", "calendario", "horario", "calculadora"] as const;
export type SeccionOcultable = (typeof SECCIONES_OCULTABLES)[number];

/** Los tamaños de interfaz que se ofrecen (en %). */
export const ZOOMS_INTERFAZ = [90, 100, 110, 125, 150] as const;

export interface Ajustes {
  tema: PreferenciaTema;
  /** Color de acento en hexadecimal (#RRGGBB). */
  acento: string;
  efecto: EfectoVentana;
  volumenPorDefecto: number;
  reproduccionAutomatica: boolean;
  alTerminar: AlTerminar;
  /** Carpeta de salida por defecto (solo en la aplicación de escritorio). */
  carpetaSalida: string | null;
  /** Al cerrar la ventana, se oculta a la bandeja del sistema en vez de cerrarse (solo escritorio). */
  segundoPlano: boolean;
  /** Avisar con una notificación cada vez que empieza a sonar una canción nueva. */
  avisarCambioCancion: boolean;
  /** Con Spotify conectado: al acabarse la cola, seguir con más canciones del mismo artista en vez de parar. */
  seguirConSimilares: boolean;
  /** Al terminar un video, pasar solo al siguiente de la cola. */
  siguienteAutomatico: boolean;
  /** Minutos antes de cada clase para avisar (0 = no avisar). */
  avisoClaseMin: number;
  /** Convertir Word, Excel, PowerPoint y PDF→Word con Microsoft Office si está instalado (mejor calidad). */
  usarOffice: boolean;
  /** Al descargar un resultado de Documentos, abrir «Guardar como» (empieza en la carpeta de las materias) en vez de guardar directo en Descargas. */
  preguntarDondeGuardar: boolean;
  /** Un resumen de lo que tienes hoy, a la hora elegida. */
  resumenDia: boolean;
  /** Hora (0-23) del resumen del día. */
  resumenHora: number;
  seccionInicial: SeccionInicial;
  /** Leer el texto de los PDF de tus carpetas de materias (en este equipo) para poder buscar dentro de ellos con Ctrl+K. */
  buscarEnPdfs: boolean;
  /** El idioma de Nexo: «sistema» (el mismo que Windows), español o inglés. */
  idioma: PreferenciaIdioma;
  /** El sonido de los avisos: uno de Nexo, uno de Windows o ninguno. */
  sonidoAvisos: SonidoAviso;
  /** Volumen (0–100) de los sonidos de Nexo. */
  volumenAvisos: number;
  /** «No molestar»: sin avisos ni sonidos entre estas horas (0–23). */
  silencioActivo: boolean;
  silencioDesde: number;
  silencioHasta: number;
  formatoHora: FormatoHora;
  primerDiaSemana: PrimerDiaSemana;
  /** Tamaño de toda la interfaz, en %. */
  zoomInterfaz: number;
  reducirMovimiento: ReducirMovimiento;
  /** Secciones escondidas de la barra lateral (siguen ahí: se llega con Ctrl+K o el teclado). */
  seccionesOcultas: SeccionOcultable[];
}

export const ACENTO_PREDETERMINADO = "#0078D4";

export const AJUSTES_PREDETERMINADOS: Ajustes = {
  tema: "oscuro",
  acento: ACENTO_PREDETERMINADO,
  efecto: "mica",
  volumenPorDefecto: 70,
  reproduccionAutomatica: true,
  alTerminar: "nada",
  carpetaSalida: null,
  segundoPlano: false,
  avisarCambioCancion: false,
  seguirConSimilares: true,
  siguienteAutomatico: true,
  avisoClaseMin: 10,
  usarOffice: true,
  preguntarDondeGuardar: true,
  resumenDia: true,
  resumenHora: 6,
  seccionInicial: "inicio",
  buscarEnPdfs: true,
  idioma: "sistema",
  sonidoAvisos: SONIDO_PREDETERMINADO,
  volumenAvisos: VOLUMEN_AVISOS_PREDETERMINADO,
  silencioActivo: SILENCIO_PREDETERMINADO.activo,
  silencioDesde: SILENCIO_PREDETERMINADO.desde,
  silencioHasta: SILENCIO_PREDETERMINADO.hasta,
  formatoHora: "24h",
  primerDiaSemana: "lunes",
  zoomInterfaz: 100,
  reducirMovimiento: "sistema",
  seccionesOcultas: [],
};

const entre = (x: unknown, min: number, max: number, reserva: number): number => (typeof x === "number" && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : reserva);

/** Los ajustes a partir de lo que haya guardado (cualquier cosa): campo a campo, lo que no sirva vuelve a su valor de fábrica. */
export function normalizarAjustes(crudo: unknown): Ajustes {
  const d = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  return {
    tema: d.tema === "claro" || d.tema === "sistema" ? d.tema : "oscuro",
    acento: typeof d.acento === "string" && /^#[0-9a-f]{6}$/i.test(d.acento) ? d.acento : ACENTO_PREDETERMINADO,
    efecto: d.efecto === "acrilico" || d.efecto === "ninguno" ? d.efecto : "mica",
    volumenPorDefecto: entre(d.volumenPorDefecto, 0, 100, 70),
    reproduccionAutomatica: d.reproduccionAutomatica !== false,
    alTerminar: d.alTerminar === "descargar" ? "descargar" : "nada",
    carpetaSalida: typeof d.carpetaSalida === "string" ? d.carpetaSalida : null,
    segundoPlano: d.segundoPlano === true,
    avisarCambioCancion: d.avisarCambioCancion === true,
    seguirConSimilares: d.seguirConSimilares !== false,
    siguienteAutomatico: d.siguienteAutomatico !== false,
    avisoClaseMin: typeof d.avisoClaseMin === "number" && [0, 5, 10, 15, 30].includes(d.avisoClaseMin) ? d.avisoClaseMin : 10,
    resumenDia: d.resumenDia !== false,
    usarOffice: d.usarOffice !== false,
    buscarEnPdfs: d.buscarEnPdfs !== false,
    idioma: d.idioma === "es" || d.idioma === "en" ? d.idioma : "sistema",
    preguntarDondeGuardar: d.preguntarDondeGuardar !== false,
    resumenHora: typeof d.resumenHora === "number" && Number.isInteger(d.resumenHora) && d.resumenHora >= 0 && d.resumenHora <= 13 ? d.resumenHora : 6,
    seccionInicial: d.seccionInicial === "ultima" || d.seccionInicial === "video" || d.seccionInicial === "musica" || d.seccionInicial === "documentos" || d.seccionInicial === "calendario" ? d.seccionInicial : "inicio",
    sonidoAvisos: esSonidoAviso(d.sonidoAvisos) ? d.sonidoAvisos : SONIDO_PREDETERMINADO,
    volumenAvisos: entre(d.volumenAvisos, 0, 100, VOLUMEN_AVISOS_PREDETERMINADO),
    silencioActivo: d.silencioActivo === true,
    silencioDesde: horaValida(d.silencioDesde, SILENCIO_PREDETERMINADO.desde),
    silencioHasta: horaValida(d.silencioHasta, SILENCIO_PREDETERMINADO.hasta),
    formatoHora: d.formatoHora === "12h" ? "12h" : "24h",
    primerDiaSemana: d.primerDiaSemana === "domingo" ? "domingo" : "lunes",
    zoomInterfaz: (ZOOMS_INTERFAZ as readonly number[]).includes(d.zoomInterfaz as number) ? (d.zoomInterfaz as number) : 100,
    reducirMovimiento: d.reducirMovimiento === "si" || d.reducirMovimiento === "no" ? d.reducirMovimiento : "sistema",
    seccionesOcultas: Array.isArray(d.seccionesOcultas) ? [...new Set(d.seccionesOcultas.filter((x): x is SeccionOcultable => (SECCIONES_OCULTABLES as readonly unknown[]).includes(x)))] : [],
  };
}
