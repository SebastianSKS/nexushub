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
  group: "Navegación" | "Buscar" | "Ayuda";
  run: () => void;
}
