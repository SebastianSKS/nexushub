import { create } from "zustand";
import { novedadesEntre, type NovedadesDeVersion } from "@/lib/novedades";

/** La versión de Nexo con la que se abrió la última vez. Empieza con «nexushub-»: entra en la copia de respaldo. */
export const CLAVE_VERSION_VISTA = "nexushub-version-vista";

interface NovedadesState {
  /** Las novedades a la vista (varias versiones si se saltó alguna), o null si el cuadro está cerrado. */
  abiertas: NovedadesDeVersion[] | null;
  /** La versión a la que corresponden. */
  version: string | null;
  abrir: (lista: NovedadesDeVersion[], version: string) => void;
  /** Cierra el cuadro y da esta versión por vista. */
  cerrar: () => void;
}

export function guardarVersionVista(version: string) {
  try {
    window.localStorage.setItem(CLAVE_VERSION_VISTA, version);
  } catch {
    /* sin almacenamiento: se mostrará otra vez la próxima vez, sin mayor problema */
  }
}

export function leerVersionVista(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_VERSION_VISTA);
  } catch {
    return null;
  }
}

export const useNovedadesStore = create<NovedadesState>((set, get) => ({
  abiertas: null,
  version: null,
  abrir: (abiertas, version) => set({ abiertas, version }),
  cerrar: () => {
    const v = get().version;
    if (v) guardarVersionVista(v);
    set({ abiertas: null });
  },
}));

/** Para «Ver novedades» en Configuración: muestra lo de las últimas versiones aunque ya se hayan visto. */
export function novedadesRecientes(version: string): NovedadesDeVersion[] {
  return novedadesEntre("0.0.0", version).slice(0, 2);
}
