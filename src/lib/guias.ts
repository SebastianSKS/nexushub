import type { NombreGlifo } from "@/lib/glifos";
import { T } from "./i18n/nucleo.ts";

/**
 * Las guías de Nexo: una bienvenida y una explicación corta por cada sección. Cada una sale sola la primera vez que se
 * entra a esa sección, y el signo de interrogación (?) de la barra de arriba la vuelve a mostrar cuando se quiera.
 *
 * Para explicar algo nuevo: añade un paso aquí (o una guía nueva y su ruta en `guiaDeRuta`); nada más.
 */

export type GuiaId = "bienvenida" | "video" | "musica" | "documentos" | "herramienta" | "carpetas" | "calendario" | "horario" | "calculadora" | "configuracion" | "atajos";

export interface PasoGuia {
  glifo: NombreGlifo;
  titulo: string;
  texto: string;
}

export interface Guia {
  id: GuiaId;
  /** Cómo se llama en el encabezado del cuadro y en la ayuda («Video», «Mis tareas»…). */
  nombre: string;
  /** Lo que dice el botón del último paso. */
  final: string;
  pasos: PasoGuia[];
}

export const GUIAS: Record<GuiaId, Guia> = {
  bienvenida: {
    id: "bienvenida",
    nombre: T("Bienvenida"),
    final: T("Empezar"),
    pasos: [
      { glifo: "informacion", titulo: T("Bienvenido a Nexo"), texto: T("Video, Música, Documentos, Calendario, Horario y Calculadora, todo en una sola ventana. Esta es solo la bienvenida: cada sección te explica cómo funciona la primera vez que entres. «Omitir» la salta.") },
      { glifo: "buscar", titulo: T("Encuentra lo que sea"), texto: T("Pulsa Ctrl + K (o la barra de arriba) y busca tareas, clases, canales, canciones, apuntes e incluso palabras dentro de tus PDF. También resuelve cuentas: escribe 25*4 y te da el resultado.") },
      { glifo: "informacion", titulo: T("Ayuda en cada sección"), texto: T("En la barra de arriba hay un signo de interrogación (?). Púlsalo en cualquier sección para ver otra vez su explicación, cuando quieras.") },
      { glifo: "carpeta", titulo: T("Tus materias, ordenadas"), texto: T("Horario, Calendario y Documentos trabajan juntos: cada materia tiene su carpeta en Documentos › Nexo › Tareas, y Nexo te avisa antes de cada clase.") },
      { glifo: "configuracion", titulo: T("Hazlo tuyo"), texto: T("En Configuración eliges el tema, el color, los avisos y más. Todo se guarda solo en este equipo.") },
    ],
  },
  video: {
    id: "video",
    nombre: T("Video"),
    final: T("Entendido"),
    pasos: [
      { glifo: "video", titulo: T("Tu muro de novedades"), texto: T("Aquí ves juntos los videos nuevos de los canales de YouTube que sigues, sin anuncios de por medio. Los más recientes van primero.") },
      { glifo: "agregar", titulo: T("Agrega tus canales"), texto: T("Usa «Agregar canal» (arriba a la derecha) y pega el enlace de un canal o de una lista de YouTube. Arrastra los canales para reordenarlos y toca uno para ver solo sus videos.") },
      { glifo: "reproducir", titulo: T("Mira sin salir de Nexo"), texto: T("Al abrir un video se reproduce dentro de Nexo. Puedes cambiar la velocidad, guardarlo en favoritos y ponerlo en cola para ver uno tras otro. Nexo recuerda por dónde ibas.") },
      { glifo: "buscar", titulo: T("Búscalo rápido"), texto: T("El buscador de arriba (Ctrl + K) también encuentra videos y canales por su título.") },
    ],
  },
  musica: {
    id: "musica",
    nombre: T("Música"),
    final: T("Entendido"),
    pasos: [
      { glifo: "musica", titulo: T("Spotify dentro de Nexo"), texto: T("Escucha música sin salir de Nexo. Puedes usarla como invitado o conectar tu cuenta de Spotify para tener tus playlists y guardar canciones.") },
      { glifo: "buscar", titulo: T("Busca y escucha"), texto: T("Escribe una canción, un artista, un álbum o una playlist. Al elegir una canción, la música sigue sola con canciones parecidas: no tienes que armar una cola.") },
      { glifo: "favorito", titulo: T("Tus favoritos y tu biblioteca"), texto: T("Marca canciones con el corazón para guardarlas. Con Spotify conectado verás también «Canciones que te gustan», tus playlists, tus artistas y tus álbumes.") },
      { glifo: "reproducir", titulo: T("Reproductor grande y letras"), texto: T("La barra de abajo tiene los controles. Ábrela en grande para ver la letra sincronizada, y programa el temporizador si quieres que la música pare sola al dormir.") },
      { glifo: "informacion", titulo: T("Permisos de Spotify"), texto: T("Si una función pide un permiso nuevo (seguir artistas, editar playlists), Nexo te lo explica y te trae de vuelta al mismo lugar. Es solo una vez.") },
    ],
  },
  documentos: {
    id: "documentos",
    nombre: T("Documentos"),
    final: T("Entendido"),
    pasos: [
      { glifo: "documentos", titulo: T("Tus archivos, en tu equipo"), texto: T("Convierte y edita PDF, Word, Excel y PowerPoint. Nada se sube a internet: todo se hace en tu propio equipo.") },
      { glifo: "agregar", titulo: T("Arrastra y elige"), texto: T("Suelta tus archivos en la zona punteada (o pégalos con Ctrl + V) y elige la herramienta: convertir, unir, dividir, comprimir, girar, marca de agua, numerar páginas, reconocer texto (OCR)…") },
      { glifo: "descargar", titulo: T("Guarda donde quieras"), texto: T("Al terminar, descarga el resultado: se abre «Guardar como» empezando en la carpeta de tus materias. Puedes cambiarlo en Configuración.") },
      { glifo: "carpeta", titulo: T("Mis tareas"), texto: T("Arriba está «Mis tareas»: una carpeta por materia para guardar y abrir tus trabajos. Desde ahí también puedes crear un Word, Excel o PowerPoint nuevo.") },
    ],
  },
  herramienta: {
    id: "herramienta",
    nombre: T("Herramienta de Documentos"),
    final: T("Entendido"),
    pasos: [
      { glifo: "agregar", titulo: T("Agrega tus archivos"), texto: T("Suelta el archivo aquí o elígelo desde tu equipo. Si ya lo tenías en la cola de Documentos, aparece solo.") },
      { glifo: "configuracion", titulo: T("Ajusta las opciones"), texto: T("Cada herramienta tiene sus opciones (calidad, páginas, texto…). Los valores que vienen puestos suelen estar bien.") },
      { glifo: "descargar", titulo: T("Procesa y descarga"), texto: T("Pulsa el botón principal, espera a que termine y descarga el resultado. Después puedes abrir la carpeta donde quedó.") },
    ],
  },
  carpetas: {
    id: "carpetas",
    nombre: T("Mis tareas"),
    final: T("Entendido"),
    pasos: [
      { glifo: "carpeta", titulo: T("Una carpeta por materia"), texto: T("Aquí se guardan tus tareas. Son carpetas reales de tu computadora, en Documentos › Nexo › Tareas, y Nexo puede crearlas desde tu horario.") },
      { glifo: "agregar", titulo: T("Añade y crea"), texto: T("Entra a una carpeta y arrastra tus archivos, o usa «Añadir archivos». «Nuevo archivo» crea un Word, Excel, PowerPoint o texto en blanco justo ahí.") },
      { glifo: "externo", titulo: T("Ábrelos con su programa"), texto: T("Toca un archivo para abrirlo con su programa. Con los botones de la derecha lo renombras o lo eliminas; una carpeta solo se elimina si está vacía.") },
      { glifo: "buscar", titulo: T("Busca dentro de tus PDF"), texto: T("Con Ctrl + K puedes buscar una palabra dentro de los PDF de tus materias y abrirlos justo en esa página.") },
    ],
  },
  calendario: {
    id: "calendario",
    nombre: T("Calendario"),
    final: T("Entendido"),
    pasos: [
      { glifo: "calendario", titulo: T("Todo lo que tienes pendiente"), texto: T("Tareas, exámenes, citas y cumpleaños de tus amigos, cada cosa con su color.") },
      { glifo: "agregar", titulo: T("Añade lo tuyo"), texto: T("Usa «Añadir tarea o evento» para crear uno, con hora y hasta repetido cada semana o cada mes. «Añadir cumpleaños» guarda los de tus amigos.") },
      { glifo: "campana", titulo: T("Que no se te pase nada"), texto: T("Nexo te avisa con una notificación de Windows. Elige cuándo avisar desde el panel de avisos.") },
      { glifo: "editar", titulo: T("Vistas y notas rápidas"), texto: T("Cambia entre la vista de mes y la de semana. Las notas rápidas guardan pendientes sueltos que no tienen fecha.") },
    ],
  },
  horario: {
    id: "horario",
    nombre: T("Horario"),
    final: T("Entendido"),
    pasos: [
      { glifo: "reloj", titulo: T("Tus clases de la semana"), texto: T("Ve tus clases de cada día, con su aula y su docente. Nexo te avisa unos minutos antes de cada una.") },
      { glifo: "camara", titulo: T("Escanéalo en vez de escribirlo"), texto: T("Si te mandaron el horario como imagen, pulsa «Escanear imagen» y se llena solo; revisa y corrige lo que haga falta. También puedes usar «Añadir clase» a mano.") },
      { glifo: "carpeta", titulo: T("Una carpeta por materia"), texto: T("Con tu horario, Nexo puede crear las carpetas de tus materias en Mis tareas para que guardes ahí tus trabajos.") },
    ],
  },
  calculadora: {
    id: "calculadora",
    nombre: T("Calculadora"),
    final: T("Entendido"),
    pasos: [
      { glifo: "calculadora", titulo: T("Normal y científica"), texto: T("Pulsa los botones o escribe con el teclado. Cambia entre la calculadora normal y la científica (con grados o radianes) cuando lo necesites.") },
      { glifo: "reloj", titulo: T("Historial"), texto: T("Tus cuentas quedan en el historial. Toca un resultado para usarlo en la siguiente cuenta.") },
      { glifo: "buscar", titulo: T("Cuentas desde la búsqueda"), texto: T("En la barra de arriba (Ctrl + K) escribe una cuenta como 25*4 y te da el resultado ahí mismo; con Enter lo copias.") },
    ],
  },
  configuracion: {
    id: "configuracion",
    nombre: T("Configuración"),
    final: T("Entendido"),
    pasos: [
      { glifo: "paleta", titulo: T("Hazlo tuyo"), texto: T("Elige tema claro u oscuro, el color de acento y el efecto de la ventana.") },
      { glifo: "campana", titulo: T("Avisos"), texto: T("Decide si te avisa antes de cada clase, si te hace un resumen del día y si te dice qué canción suena.") },
      { glifo: "documentos", titulo: T("Documentos"), texto: T("Convertir con Microsoft Office, elegir dónde guardar y buscar dentro de tus PDF se cambian en la sección Documentos de esta página.") },
      { glifo: "actualizar", titulo: T("Actualizaciones"), texto: T("En «Acerca de» buscas actualizaciones y puedes ver otra vez la bienvenida. Tus datos se guardan solo en este equipo.") },
    ],
  },
  atajos: {
    id: "atajos",
    nombre: T("Atajos de teclado"),
    final: T("Entendido"),
    pasos: [{ glifo: "atajos", titulo: T("Hazlo más rápido"), texto: T("Aquí están todos los atajos. Los más útiles: Ctrl + K para buscar y Ctrl + 1 a Ctrl + 6 para saltar de sección.") }],
  },
};

/** La guía de la pantalla en la que se está (según la dirección), o null si esa pantalla no tiene. */
export function guiaDeRuta(ruta: string): GuiaId | null {
  const r = ruta.replace(/\/+$/, "") || "/";
  if (r === "/" || r === "/inicio") return "bienvenida";
  if (r.startsWith("/video")) return "video";
  if (r.startsWith("/musica")) return "musica";
  if (r === "/documentos") return "documentos";
  if (r.startsWith("/documentos/carpetas")) return "carpetas";
  if (r.startsWith("/documentos/")) return "herramienta";
  if (r.startsWith("/calendario")) return "calendario";
  if (r.startsWith("/horario")) return "horario";
  if (r.startsWith("/calculadora")) return "calculadora";
  if (r.startsWith("/configuracion")) return "configuracion";
  if (r.startsWith("/atajos")) return "atajos";
  return null;
}
