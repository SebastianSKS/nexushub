import type { NombreGlifo } from "@/lib/glifos";

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
    nombre: "Bienvenida",
    final: "Empezar",
    pasos: [
      { glifo: "informacion", titulo: "Bienvenido a Nexo", texto: "Video, Música, Documentos, Calendario, Horario y Calculadora, todo en una sola ventana. Esta es solo la bienvenida: cada sección te explica cómo funciona la primera vez que entres. «Omitir» la salta." },
      { glifo: "buscar", titulo: "Encuentra lo que sea", texto: "Pulsa Ctrl + K (o la barra de arriba) y busca tareas, clases, canales, canciones, apuntes e incluso palabras dentro de tus PDF. También resuelve cuentas: escribe 25*4 y te da el resultado." },
      { glifo: "informacion", titulo: "Ayuda en cada sección", texto: "En la barra de arriba hay un signo de interrogación (?). Púlsalo en cualquier sección para ver otra vez su explicación, cuando quieras." },
      { glifo: "carpeta", titulo: "Tus materias, ordenadas", texto: "Horario, Calendario y Documentos trabajan juntos: cada materia tiene su carpeta en Documentos › Nexo › Tareas, y Nexo te avisa antes de cada clase." },
      { glifo: "configuracion", titulo: "Hazlo tuyo", texto: "En Configuración eliges el tema, el color, los avisos y más. Todo se guarda solo en este equipo." },
    ],
  },
  video: {
    id: "video",
    nombre: "Video",
    final: "Entendido",
    pasos: [
      { glifo: "video", titulo: "Tu muro de novedades", texto: "Aquí ves juntos los videos nuevos de los canales de YouTube que sigues, sin anuncios de por medio. Los más recientes van primero." },
      { glifo: "agregar", titulo: "Agrega tus canales", texto: "Usa «Agregar canal» (arriba a la derecha) y pega el enlace de un canal o de una lista de YouTube. Arrastra los canales para reordenarlos y toca uno para ver solo sus videos." },
      { glifo: "reproducir", titulo: "Mira sin salir de Nexo", texto: "Al abrir un video se reproduce dentro de Nexo. Puedes cambiar la velocidad, guardarlo en favoritos y ponerlo en cola para ver uno tras otro. Nexo recuerda por dónde ibas." },
      { glifo: "buscar", titulo: "Búscalo rápido", texto: "El buscador de arriba (Ctrl + K) también encuentra videos y canales por su título." },
    ],
  },
  musica: {
    id: "musica",
    nombre: "Música",
    final: "Entendido",
    pasos: [
      { glifo: "musica", titulo: "Spotify dentro de Nexo", texto: "Escucha música sin salir de Nexo. Puedes usarla como invitado o conectar tu cuenta de Spotify para tener tus playlists y guardar canciones." },
      { glifo: "buscar", titulo: "Busca y escucha", texto: "Escribe una canción, un artista, un álbum o una playlist. Al elegir una canción, la música sigue sola con canciones parecidas: no tienes que armar una cola." },
      { glifo: "favorito", titulo: "Tus favoritos y tu biblioteca", texto: "Marca canciones con el corazón para guardarlas. Con Spotify conectado verás también «Canciones que te gustan», tus playlists, tus artistas y tus álbumes." },
      { glifo: "reproducir", titulo: "Reproductor grande y letras", texto: "La barra de abajo tiene los controles. Ábrela en grande para ver la letra sincronizada, y programa el temporizador si quieres que la música pare sola al dormir." },
      { glifo: "informacion", titulo: "Permisos de Spotify", texto: "Si una función pide un permiso nuevo (seguir artistas, editar playlists), Nexo te lo explica y te trae de vuelta al mismo lugar. Es solo una vez." },
    ],
  },
  documentos: {
    id: "documentos",
    nombre: "Documentos",
    final: "Entendido",
    pasos: [
      { glifo: "documentos", titulo: "Tus archivos, en tu equipo", texto: "Convierte y edita PDF, Word, Excel y PowerPoint. Nada se sube a internet: todo se hace en tu propio equipo." },
      { glifo: "agregar", titulo: "Arrastra y elige", texto: "Suelta tus archivos en la zona punteada (o pégalos con Ctrl + V) y elige la herramienta: convertir, unir, dividir, comprimir, girar, marca de agua, numerar páginas, reconocer texto (OCR)…" },
      { glifo: "descargar", titulo: "Guarda donde quieras", texto: "Al terminar, descarga el resultado: se abre «Guardar como» empezando en la carpeta de tus materias. Puedes cambiarlo en Configuración." },
      { glifo: "carpeta", titulo: "Mis tareas", texto: "Arriba está «Mis tareas»: una carpeta por materia para guardar y abrir tus trabajos. Desde ahí también puedes crear un Word, Excel o PowerPoint nuevo." },
    ],
  },
  herramienta: {
    id: "herramienta",
    nombre: "Herramienta de Documentos",
    final: "Entendido",
    pasos: [
      { glifo: "agregar", titulo: "Agrega tus archivos", texto: "Suelta el archivo aquí o elígelo desde tu equipo. Si ya lo tenías en la cola de Documentos, aparece solo." },
      { glifo: "configuracion", titulo: "Ajusta las opciones", texto: "Cada herramienta tiene sus opciones (calidad, páginas, texto…). Los valores que vienen puestos suelen estar bien." },
      { glifo: "descargar", titulo: "Procesa y descarga", texto: "Pulsa el botón principal, espera a que termine y descarga el resultado. Después puedes abrir la carpeta donde quedó." },
    ],
  },
  carpetas: {
    id: "carpetas",
    nombre: "Mis tareas",
    final: "Entendido",
    pasos: [
      { glifo: "carpeta", titulo: "Una carpeta por materia", texto: "Aquí se guardan tus tareas. Son carpetas reales de tu computadora, en Documentos › Nexo › Tareas, y Nexo puede crearlas desde tu horario." },
      { glifo: "agregar", titulo: "Añade y crea", texto: "Entra a una carpeta y arrastra tus archivos, o usa «Añadir archivos». «Nuevo archivo» crea un Word, Excel, PowerPoint o texto en blanco justo ahí." },
      { glifo: "externo", titulo: "Ábrelos con su programa", texto: "Toca un archivo para abrirlo con su programa. Con los botones de la derecha lo renombras o lo eliminas; una carpeta solo se elimina si está vacía." },
      { glifo: "buscar", titulo: "Busca dentro de tus PDF", texto: "Con Ctrl + K puedes buscar una palabra dentro de los PDF de tus materias y abrirlos justo en esa página." },
    ],
  },
  calendario: {
    id: "calendario",
    nombre: "Calendario",
    final: "Entendido",
    pasos: [
      { glifo: "calendario", titulo: "Todo lo que tienes pendiente", texto: "Tareas, exámenes, citas y cumpleaños de tus amigos, cada cosa con su color." },
      { glifo: "agregar", titulo: "Añade lo tuyo", texto: "Usa «Añadir tarea o evento» para crear uno, con hora y hasta repetido cada semana o cada mes. «Añadir cumpleaños» guarda los de tus amigos." },
      { glifo: "campana", titulo: "Que no se te pase nada", texto: "Nexo te avisa con una notificación de Windows. Elige cuándo avisar desde el panel de avisos." },
      { glifo: "editar", titulo: "Vistas y notas rápidas", texto: "Cambia entre la vista de mes y la de semana. Las notas rápidas guardan pendientes sueltos que no tienen fecha." },
    ],
  },
  horario: {
    id: "horario",
    nombre: "Horario",
    final: "Entendido",
    pasos: [
      { glifo: "reloj", titulo: "Tus clases de la semana", texto: "Ve tus clases de cada día, con su aula y su docente. Nexo te avisa unos minutos antes de cada una." },
      { glifo: "camara", titulo: "Escanéalo en vez de escribirlo", texto: "Si te mandaron el horario como imagen, pulsa «Escanear imagen» y se llena solo; revisa y corrige lo que haga falta. También puedes usar «Añadir clase» a mano." },
      { glifo: "carpeta", titulo: "Una carpeta por materia", texto: "Con tu horario, Nexo puede crear las carpetas de tus materias en Mis tareas para que guardes ahí tus trabajos." },
    ],
  },
  calculadora: {
    id: "calculadora",
    nombre: "Calculadora",
    final: "Entendido",
    pasos: [
      { glifo: "calculadora", titulo: "Normal y científica", texto: "Pulsa los botones o escribe con el teclado. Cambia entre la calculadora normal y la científica (con grados o radianes) cuando lo necesites." },
      { glifo: "reloj", titulo: "Historial", texto: "Tus cuentas quedan en el historial. Toca un resultado para usarlo en la siguiente cuenta." },
      { glifo: "buscar", titulo: "Cuentas desde la búsqueda", texto: "En la barra de arriba (Ctrl + K) escribe una cuenta como 25*4 y te da el resultado ahí mismo; con Enter lo copias." },
    ],
  },
  configuracion: {
    id: "configuracion",
    nombre: "Configuración",
    final: "Entendido",
    pasos: [
      { glifo: "paleta", titulo: "Hazlo tuyo", texto: "Elige tema claro u oscuro, el color de acento y el efecto de la ventana." },
      { glifo: "campana", titulo: "Avisos", texto: "Decide si te avisa antes de cada clase, si te hace un resumen del día y si te dice qué canción suena." },
      { glifo: "documentos", titulo: "Documentos", texto: "Convertir con Microsoft Office, elegir dónde guardar y buscar dentro de tus PDF se cambian en la sección Documentos de esta página." },
      { glifo: "actualizar", titulo: "Actualizaciones", texto: "En «Acerca de» buscas actualizaciones y puedes ver otra vez la bienvenida. Tus datos se guardan solo en este equipo." },
    ],
  },
  atajos: {
    id: "atajos",
    nombre: "Atajos de teclado",
    final: "Entendido",
    pasos: [{ glifo: "atajos", titulo: "Hazlo más rápido", texto: "Aquí están todos los atajos. Los más útiles: Ctrl + K para buscar y Ctrl + 1 a Ctrl + 6 para saltar de sección." }],
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
