import { create } from "zustand";
import { normalizarPasosGuardados, PASOS_GUARDADOS_INICIAL, type PasosGuardados } from "@/lib/primeros-pasos";

/** Lo que se recuerda de la lista de primeros pasos. Empieza con «nexushub-»: entra en la copia de seguridad. */
export const CLAVE_PRIMEROS_PASOS = "nexushub-primeros-pasos";

function leer(): PasosGuardados {
  try {
    return normalizarPasosGuardados(JSON.parse(window.localStorage.getItem(CLAVE_PRIMEROS_PASOS) ?? "null"));
  } catch {
    return PASOS_GUARDADOS_INICIAL;
  }
}

function guardar(g: PasosGuardados) {
  try {
    window.localStorage.setItem(CLAVE_PRIMEROS_PASOS, JSON.stringify(g));
  } catch {
    /* sin almacenamiento: la lista puede volver a salir la próxima vez, sin mayor problema */
  }
}

interface PrimerosPasosState extends PasosGuardados {
  cargado: boolean;
  cargar: () => void;
  /** Anota algo que no se puede saber mirando los datos: que ya se probó la búsqueda o que ya se crearon carpetas. */
  marcar: (paso: "buscador" | "carpetas") => void;
  /** La persona la oculta a propósito. */
  descartar: () => void;
  /** Ya se terminó: no vuelve a salir sola. */
  completar: () => void;
  /** Vuelve a empezar (desde Configuración): la lista sale otra vez y se olvida lo probado. */
  reiniciar: () => void;
}

const datos = (s: PasosGuardados): PasosGuardados => ({ buscador: s.buscador, carpetas: s.carpetas, descartado: s.descartado, completado: s.completado });

export const usePrimerosPasosStore = create<PrimerosPasosState>((set, get) => ({
  ...PASOS_GUARDADOS_INICIAL,
  cargado: false,

  cargar: () => {
    if (get().cargado) return;
    set({ ...leer(), cargado: true });
  },

  marcar: (paso) => {
    if (get()[paso]) return;
    set({ [paso]: true });
    guardar(datos(get()));
  },

  descartar: () => {
    set({ descartado: true });
    guardar(datos(get()));
  },

  completar: () => {
    if (get().completado) return;
    set({ completado: true });
    guardar(datos(get()));
  },

  reiniciar: () => {
    // Se conserva lo que ya se sabe de verdad (buscador y carpetas), solo vuelve a salir la lista.
    set({ descartado: false, completado: false });
    guardar(datos(get()));
  },
}));
