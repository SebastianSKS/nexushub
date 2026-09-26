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
