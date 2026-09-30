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
