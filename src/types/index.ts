import type { MarcaId } from "@/components/fluent/LogoMarca";
import type { NombreGlifo } from "@/lib/glifos";

/** Operación en curso mostrada en la barra de estado */
export interface StatusOperation {
  label: string;
  /** 0-100. `undefined` solo cuando el progreso real no se puede conocer. */
  progress?: number;
}

/** Contenido en reproducción mostrado en la barra de estado */
export interface NowPlaying {
  kind: "video" | "music";
  title: string;
  subtitle?: string;
}

export interface ShortcutDefinition {
  keys: string[];
  description: string;
}

export interface Command {
  id: string;
  label: string;
  hint?: string;
  keywords: string[];
  shortcut?: string[];
  /** Título del grupo bajo el que sale: «Navegación», «Tareas y eventos», «Canales»… */
  group: string;
  /** Ícono de Segoe Fluent Icons delante del resultado (los resultados de contenido lo llevan). */
  icon?: NombreGlifo;
  /** Logo original (Spotify, YouTube, PDF…) en lugar del ícono. */
  marca?: MarcaId;
  /** Color con el que se marca el ícono (el de la clase, el evento…). */
  color?: string;
  /** Un texto más largo bajo el título (hasta dos líneas), como el fragmento de un PDF donde apareció lo buscado. */
  detalle?: string;
  /** Palabras (ya sin acentos ni mayúsculas) que se resaltan dentro de `detalle`. */
  resaltar?: string[];
  run: () => void;
}
