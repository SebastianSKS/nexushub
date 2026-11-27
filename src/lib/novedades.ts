import type { NombreGlifo } from "@/lib/glifos";
import { T } from "./i18n/nucleo.ts";

/**
 * Lo que cambió en cada versión de Nexo, escrito para quien lo usa (no para quien lo programa). Cuando alguien actualiza,
 * la primera vez que abre Nexo ve un cuadro con lo nuevo desde la versión que tenía. Al publicar una versión, añade aquí su
 * entrada (y pon lo mismo en las notas del Release).
 */

export interface Novedad {
  glifo: NombreGlifo;
  titulo: string;
  texto: string;
}

export interface NovedadesDeVersion {
  version: string;
  novedades: Novedad[];
}

/** De la más nueva a la más vieja. */
export const NOVEDADES: readonly NovedadesDeVersion[] = [
  {
    version: "0.3.7",
    novedades: [
      { glifo: "musica", titulo: T("El fondo se viste de tu música"), texto: T("Mientras suena algo, el fondo de toda la app toma los colores de la portada y se mueve despacio; al cambiar de canción cambia con ellos. Si prefieres el fondo de siempre, apágalo en Configuración › Apariencia › Fondo según la música.") },
      { glifo: "documentos", titulo: T("Documentos: haz una cola"), texto: T("Ya no hay que esperar a que termine una conversión para empezar otra: pulsa Convertir, cambia de herramienta y añade la siguiente (Word a PDF, luego Excel a PDF…). Se hacen una tras otra y cada resultado se queda en la cola. Si sueltas archivos mezclados ya no se quita ninguno, y en Documentos, «Iniciar cola» convierte a PDF todos tus Word, Excel, PowerPoint e imágenes.") },
      { glifo: "configuracion", titulo: T("Configuración, por categorías"), texto: T("Al entrar a Configuración, la barra lateral muestra las categorías (Apariencia, Avisos, Documentos…) y ves solo los ajustes de la que elijas. «Inicio», arriba, te regresa a la pantalla en la que estabas; también con Esc.") },
      { glifo: "buscar", titulo: T("El buscador encuentra tus ajustes"), texto: T("Pulsa Ctrl + K y escribe «tema», «no molestar» o «idioma»: te lleva directo a ese ajuste y lo marca. Buscar en Música ahora sale al final, así Enter ya no te manda ahí sin querer.") },
      { glifo: "inicio", titulo: T("Abre donde te quedaste, también ahí"), texto: T("Si al abrir Nexo eliges «La última usada», ahora también regresa a Semestres anteriores y a las páginas de artista, biblioteca y Me gusta de Música.") },
    ],
  },
  {
    version: "0.3.6",
    novedades: [
      { glifo: "carpeta", titulo: T("Mis tareas, en la barra lateral"), texto: T("Las carpetas de tus materias ahora están a un clic, debajo de Calendario. También llegas con Ctrl + 8.") },
      { glifo: "repaso", titulo: T("Repaso, más intuitivo"), texto: T("Toca la tarjeta para voltearla y, antes de calificar, verás cuándo volverá a salir. Practica cuando quieras sin mover tu calendario, repite repasos anteriores o estudia solo las tarjetas que te costaron.") },
      { glifo: "calendario", titulo: T("Cambio de semestre"), texto: T("En Horario, pulsa el nombre del semestre para empezar uno nuevo: el anterior se guarda. En «Anteriores» ves cada uno con su semana en colores y puedes recuperarlo. Si quieres, Nexo archiva las carpetas de esas materias en Tareas › Anteriores (no se borra nada; mientras están ahí no salen en Mis tareas ni en el buscador) y las regresa al recuperarlo.") },
    ],
  },
  {
    version: "0.3.5",
    novedades: [
      { glifo: "musica", titulo: T("Spotify, sin configurar nada"), texto: T("«Conectar con Spotify Premium» ya funciona de entrada: pulsas, inicias sesión en la página de Spotify (con tu correo, Google, Facebook o Apple) y listo. Ya no hay que crear una app ni editar archivos. Si tu cuenta aún no está autorizada, Nexo te lo dice y te explica qué hacer; y si prefieres usar tu propia app de Spotify, ahora la pegas desde Música.") },
    ],
  },
  {
    version: "0.3.4",
    novedades: [
      { glifo: "repaso", titulo: T("Repaso, más a la mano"), texto: T("Repaso ya aparece en Inicio con su propia tarjeta, en la bienvenida y en los atajos (Ctrl + 1 a Ctrl + 7). Y tiene su guía la primera vez que entras: te cuenta cómo crear mazos, pegar tus apuntes y estudiar con el teclado.") },
    ],
  },
  {
    version: "0.3.3",
    novedades: [
      { glifo: "repaso", titulo: T("Repaso: tarjetas de estudio"), texto: T("Una sección nueva (Ctrl + 7) para estudiar con tarjetas: creas un mazo por materia, añades preguntas y respuestas —o pegas tus apuntes y Nexo las arma solo— y Nexo te las repite justo antes de que se te olviden. Todo se queda en tu equipo.") },
      { glifo: "video", titulo: T("«Volver al video» siempre a la vista"), texto: T("Cuando minimizas un video, la miniatura ahora muestra siempre el botón «Volver al video». Antes solo aparecía al pasar el cursor por encima y era fácil no verlo.") },
    ],
  },
  {
    version: "0.3.2",
    novedades: [
      { glifo: "campana", titulo: T("Los avisos llegan aunque cierres la ventana"), texto: T("Antes, al pulsar la X, Nexo se cerraba del todo y dejaba de avisar. Ahora la X lo manda a la bandeja (junto al reloj de Windows): sigue avisando de tus clases, eventos y cumpleaños a su hora aunque no tengas la ventana abierta. Para cerrarlo por completo, haz clic derecho en el icono de la bandeja y pulsa «Salir».") },
      { glifo: "video", titulo: T("La miniatura de video se mueve mejor"), texto: T("Al arrastrar la miniatura flotante de YouTube por la pantalla ya no se traba ni se queda a medio camino: ahora sigue el cursor de forma fluida.") },
    ],
  },
  {
    version: "0.3.1",
    novedades: [
      { glifo: "documentos", titulo: T("Desbloquear PDF"), texto: T("¿Olvidaste la contraseña de un PDF tuyo? En Documentos hay una herramienta nueva: suéltalo, pulsa Desbloquear y Nexo busca sola la contraseña (contraseñas comunes, números y combinaciones cortas) y te abre el PDF. Todo pasa en tu equipo, sin subir nada. Las contraseñas sencillas aparecen; una larga y al azar no se puede recuperar así.") },
    ],
  },
  {
    version: "0.3.0",
    novedades: [
      { glifo: "externo", titulo: T("Nexo también en Linux"), texto: T("Hay instalador para Linux: un .deb para Ubuntu, Debian, Mint y Pop!_OS, y un AppImage que se ejecuta sin instalar. Del mismo Release, con la misma bandeja, el mismo calendario, el mismo horario y los mismos PDF. También se actualiza solo.") },
      { glifo: "documentos", titulo: T("Convierte con LibreOffice"), texto: T("En Linux, si tienes LibreOffice, las conversiones a PDF las hace él: Writer para Word, Calc para Excel e Impress para PowerPoint, con la misma calidad que guardar el archivo como PDF desde ahí. En Windows, sigue usando Microsoft Office igual que hasta ahora.") },
      { glifo: "informacion", titulo: T("Lo que en Linux no cambia"), texto: T("La música no se reproduce dentro de Nexo: Spotify solo da su protección de contenido a los navegadores Chromium, y la ventana en Linux no lo es. Puedes abrir lo que quieras en la app o en el navegador de Spotify como siempre. Todo lo demás funciona igual que en Windows.") },
    ],
  },
  {
    version: "0.2.4",
    novedades: [
      { glifo: "exito", titulo: T("Se siente más de escritorio"), texto: T("Ya no aparece el menú del navegador (Copiar, Imprimir…) al hacer clic derecho, ni se selecciona toda la pantalla al arrastrar el ratón. Sigue funcionando donde hace falta: en el buscador, tus notas y los demás campos de texto.") },
    ],
  },
  {
    version: "0.2.3",
    novedades: [
      { glifo: "calculadora", titulo: T("Promedio de calificaciones"), texto: T("En Calculadora hay una pestaña Promedio: añade tus materias (o tráelas de tu horario), pon el peso de cada evaluación y mira cómo vas y cuánto necesitas para aprobar.") },
      { glifo: "compartir", titulo: T("Comparte tu horario"), texto: T("Con «Compartir», en Horario, mandas tu horario como archivo o como un código para pegar en un mensaje. Tu compañero lo importa sin escanearlo ni escribirlo.") },
      { glifo: "documentos", titulo: T("Más cuidado por dentro"), texto: T("Más pruebas automáticas en documentos: unir, dividir, girar, proteger con contraseña e imágenes a PDF, para que salgan bien la primera vez.") },
    ],
  },
  {
    version: "0.2.2",
    novedades: [
      { glifo: "reloj", titulo: T("Tu día de un vistazo"), texto: T("En Inicio, una tarjeta con la clase que sigue (y cuánto falta), lo que entregas esta semana y lo pendiente de tus notas.") },
      { glifo: "energia", titulo: T("Modo de bajo consumo"), texto: T("Si tu computadora es modesta, Nexo se pone más ligero solo: sin transparencia, menos animaciones y la búsqueda en archivos más pausada. Se puede cambiar en Configuración.") },
      { glifo: "actualizar", titulo: T("Abre más rápido"), texto: T("Nexo carga menos cosas al arrancar y descansa cuando la ventana está en la bandeja.") },
    ],
  },
  {
    version: "0.2.1",
    novedades: [
      { glifo: "exito", titulo: T("Primeros pasos en Inicio"), texto: T("Una lista corta (tu nombre, tu horario, las carpetas de tus materias, un examen y la búsqueda) que se marca sola. Se puede ocultar y no se mete con las guías.") },
      { glifo: "informacion", titulo: T("Pantallas vacías que enseñan"), texto: T("Si el Horario, el Calendario, Mis tareas o Video todavía no tienen nada, ahora te explican cómo empezar en tres pasos, con el botón listo.") },
      { glifo: "campana", titulo: T("Consejos justo a tiempo"), texto: T("La primera vez que guardas una clase, un evento con hora o una carpeta, un aviso breve te cuenta qué pasa a continuación. Se pueden apagar en Configuración.") },
    ],
  },
  {
    version: "0.2.0",
    novedades: [
      { glifo: "campana", titulo: T("Avisos con tu sonido"), texto: T("Elige cómo suenan (cinco sonidos de Nexo o los de Windows) y activa «No molestar» en las horas que quieras. Ahora los avisos salen como «Nexo», con su icono.") },
      { glifo: "examen", titulo: T("Aviso antes de un examen"), texto: T("Si un evento tiene hora, Nexo te avisa unos minutos antes de que empiece (tú eliges cuántos).") },
      { glifo: "paleta", titulo: T("Hazlo más tuyo"), texto: T("Cualquier color de acento, tamaño de la interfaz, horas en 12 o 24 horas, semana que empieza en lunes o domingo, menos animaciones y secciones que puedes esconder.") },
      { glifo: "descargar", titulo: T("Copia de seguridad"), texto: T("Guarda todos tus datos en un archivo y restáuralos en otra computadora. No incluye tu sesión de Spotify.") },
      { glifo: "energia", titulo: T("Nexo en la bandeja al encender el equipo"), texto: T("Con «Iniciar con Windows», Nexo arranca directo en la bandeja, sin abrir ventana, y te sigue avisando.") },
      { glifo: "informacion", titulo: T("Más cuidado por dentro"), texto: T("Si algo falla ves una pantalla clara (tus datos están a salvo) con un botón para avisar del problema, y la barra de abajo dice cuando no hay internet.") },
    ],
  },
  {
    version: "0.1.4",
    novedades: [
      { glifo: "pantalla", titulo: T("Nexo también en inglés"), texto: T("En Configuración › Apariencia › Idioma elige Español, English o «Igual que Windows». Cambia todo: menús, guías, novedades, avisos y hasta la bandeja del sistema.") },
      { glifo: "buscar", titulo: T("Busca dentro de Word, Excel y PowerPoint"), texto: T("Ctrl + K ahora encuentra palabras también dentro de los Word, Excel y PowerPoint de tus carpetas de materias, además de los PDF. Excel te dice la hoja y PowerPoint la diapositiva.") },
      { glifo: "musica", titulo: T("La canción, en la bandeja"), texto: T("El menú del icono junto al reloj muestra lo que suena, con su carátula, y desde ahí puedes pausar o pasar a la siguiente.") },
      { glifo: "actualizar", titulo: T("Actualizaciones más seguras"), texto: T("Si la descarga falla se reintenta sola y, si aun así no se puede, te lo dice con un botón «Reintentar». Tus datos se guardan antes de instalar.") },
      { glifo: "exito", titulo: T("Más cuidado por dentro"), texto: T("Nexo ahora se revisa solo con pruebas automáticas cada vez que se cambia algo, para que las actualizaciones lleguen más estables.") },
    ],
  },
  {
    version: "0.1.3",
    novedades: [
      { glifo: "informacion", titulo: T("Guías en cada sección"), texto: T("Cada apartado te explica cómo funciona la primera vez que entras. Si se te olvida algo, pulsa «¿Cómo funciona?» junto al título y vuelve a salir.") },
      { glifo: "actualizar", titulo: T("Actualizaciones sin buscarlas"), texto: T("Nexo revisa solo al abrir y, si hay una versión nueva, te avisa con un botón «Actualizar ahora». Tus datos se conservan.") },
      { glifo: "documentos", titulo: T("Logos de verdad"), texto: T("Los PDF, Word, Excel, PowerPoint y Bloc de notas muestran el logo real de su programa, y también Spotify y YouTube en la búsqueda.") },
      { glifo: "ojo", titulo: T("Este cuadro de novedades"), texto: T("Después de cada actualización verás aquí qué cambió. Puedes volver a abrirlo desde Configuración › Acerca de.") },
    ],
  },
  {
    version: "0.1.2",
    novedades: [{ glifo: "documentos", titulo: T("Logos originales de Office"), texto: T("«Nuevo archivo», las herramientas de Documentos y las carpetas de tus materias usan los logos reales de Word, Excel, PowerPoint y Bloc de notas.") }],
  },
  {
    version: "0.1.1",
    novedades: [
      { glifo: "buscar", titulo: T("Busca dentro de tus PDF"), texto: T("Pulsa Ctrl + K y escribe una palabra: Nexo la encuentra dentro de los PDF de tus carpetas de materias y los abre justo en esa página.") },
      { glifo: "agregar", titulo: T("Nuevo archivo en cada materia"), texto: T("En Mis tareas, dentro de una materia, crea un Word, Excel, PowerPoint o texto en blanco directamente ahí.") },
    ],
  },
];

/** Compara dos versiones «1.2.3»: negativo si a es más vieja, 0 si iguales, positivo si a es más nueva. */
export function compararVersiones(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Las novedades de las versiones posteriores a `desde` y hasta `hasta` (incluida), las más nuevas primero. */
export function novedadesEntre(desde: string, hasta: string): NovedadesDeVersion[] {
  return NOVEDADES.filter((n) => compararVersiones(n.version, desde) > 0 && compararVersiones(n.version, hasta) <= 0);
}
