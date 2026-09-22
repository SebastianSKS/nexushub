import { create } from "zustand";

const CLAVE = "nexushub-perfil";

/**
 * Perfil local y OPCIONAL. No es una cuenta en internet: el nombre y la foto se guardan solo en este
 * equipo (en el almacenamiento del navegador o de la aplicación) y no se envían a ningún sitio.
 */
interface PerfilState {
  cargado: boolean;
  nombre: string | null;
  /** Foto cuadrada de 256 px, como data URL. */
  foto: string | null;

  cargar: () => void;
  iniciarSesion: (nombre: string, foto: string | null) => void;
  cerrarSesion: () => void;
}

function guardar(nombre: string | null, foto: string | null) {
  try {
    if (nombre) window.localStorage.setItem(CLAVE, JSON.stringify({ nombre, foto }));
    else window.localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: el perfil dura solo esta sesión */
  }
}

export const usePerfilStore = create<PerfilState>((set, get) => ({
  cargado: false,
  nombre: null,
  foto: null,

  cargar: () => {
    if (get().cargado) return;
    try {
      const d = JSON.parse(window.localStorage.getItem(CLAVE) ?? "null") as { nombre?: unknown; foto?: unknown } | null;
      const nombre = typeof d?.nombre === "string" && d.nombre.trim() ? d.nombre.trim().slice(0, 30) : null;
      const foto = typeof d?.foto === "string" && d.foto.startsWith("data:image/") ? d.foto : null;
      set({ cargado: true, nombre, foto: nombre ? foto : null });
    } catch {
      set({ cargado: true });
    }
  },

  iniciarSesion: (nombre, foto) => {
    const n = nombre.trim().slice(0, 30);
    set({ nombre: n, foto });
    guardar(n, foto);
  },

  cerrarSesion: () => {
    set({ nombre: null, foto: null });
    guardar(null, null);
  },
}));
