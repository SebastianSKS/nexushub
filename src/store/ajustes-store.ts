import { create } from "zustand";

export type PreferenciaTema = "claro" | "oscuro" | "sistema";
export type EfectoVentana = "mica" | "acrilico" | "ninguno";
export type AlTerminar = "nada" | "descargar" | "abrir-carpeta";

export interface Ajustes {
  tema: PreferenciaTema;
  /** Color de acento en hexadecimal (#RRGGBB). */
  acento: string;
  efecto: EfectoVentana;
  volumenPorDefecto: number;
  reproduccionAutomatica: boolean;
  alTerminar: AlTerminar;
  /** Carpeta de salida por defecto (solo en la aplicación de escritorio). */
  carpetaSalida: string | null;
  /** Al cerrar la ventana, se oculta a la bandeja del sistema en vez de cerrarse (solo escritorio). */
  segundoPlano: boolean;
  /** Avisar con una notificación cada vez que empieza a sonar una canción nueva. */
  avisarCambioCancion: boolean;
}

export const ACENTO_PREDETERMINADO = "#0078D4";

/** Acentos de Windows 11 que ofrece la página de Configuración. */
export const ACENTOS: readonly { nombre: string; valor: string }[] = [
  { nombre: "Azul", valor: "#0078D4" },
  { nombre: "Cian", valor: "#0099BC" },
  { nombre: "Verde", valor: "#10893E" },
  { nombre: "Naranja", valor: "#CA5010" },
  { nombre: "Rojo", valor: "#C42B1C" },
  { nombre: "Rosa", valor: "#C239B3" },
  { nombre: "Violeta", valor: "#744DA9" },
  { nombre: "Gris", valor: "#5D6870" },
];

export const AJUSTES_PREDETERMINADOS: Ajustes = {
  tema: "oscuro",
  acento: ACENTO_PREDETERMINADO,
  efecto: "mica",
  volumenPorDefecto: 70,
  reproduccionAutomatica: true,
  alTerminar: "nada",
  carpetaSalida: null,
  segundoPlano: false,
  avisarCambioCancion: false,
};

export const CLAVE_AJUSTES = "nexushub-ajustes";

function leer(): Ajustes {
  try {
    const crudo = window.localStorage.getItem(CLAVE_AJUSTES);
    if (!crudo) return AJUSTES_PREDETERMINADOS;
    const d = JSON.parse(crudo) as Partial<Ajustes>;
    return {
      tema: d.tema === "claro" || d.tema === "sistema" ? d.tema : "oscuro",
      acento: typeof d.acento === "string" && /^#[0-9a-f]{6}$/i.test(d.acento) ? d.acento : ACENTO_PREDETERMINADO,
      efecto: d.efecto === "acrilico" || d.efecto === "ninguno" ? d.efecto : "mica",
      volumenPorDefecto:
        typeof d.volumenPorDefecto === "number" ? Math.min(100, Math.max(0, Math.round(d.volumenPorDefecto))) : 70,
      reproduccionAutomatica: d.reproduccionAutomatica !== false,
      alTerminar: d.alTerminar === "descargar" ? "descargar" : "nada",
      carpetaSalida: typeof d.carpetaSalida === "string" ? d.carpetaSalida : null,
      segundoPlano: d.segundoPlano === true,
      avisarCambioCancion: d.avisarCambioCancion === true,
    };
  } catch {
    return AJUSTES_PREDETERMINADOS; // almacenamiento bloqueado o JSON dañado: se usan los valores por defecto
  }
}

function guardar(a: Ajustes) {
  try {
    window.localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(a));
  } catch {
    /* modo incógnito: los ajustes duran solo esta sesión */
  }
}

/** Traduce los ajustes a atributos y variables CSS del <html>. */
export function aplicarAjustes(a: Ajustes) {
  const root = document.documentElement;
  const oscuroSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resuelto = a.tema === "sistema" ? (oscuroSistema ? "dark" : "light") : a.tema === "claro" ? "light" : "dark";
  root.dataset.theme = resuelto;
  root.dataset.efecto = a.efecto;

  if (a.acento.toLowerCase() === ACENTO_PREDETERMINADO.toLowerCase()) {
    // Acento de Windows por defecto: valores exactos del sistema de diseño.
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-hover");
    root.style.removeProperty("--accent-pressed");
  } else {
    root.style.setProperty("--accent", a.acento);
    root.style.setProperty("--accent-hover", `color-mix(in srgb, ${a.acento} 88%, white)`);
    root.style.setProperty("--accent-pressed", `color-mix(in srgb, ${a.acento} 82%, black)`);
  }
}

interface AjustesState extends Ajustes {
  cargado: boolean;
  cargar: () => void;
  cambiar: (parcial: Partial<Ajustes>) => void;
  restablecer: () => void;
}

export const useAjustesStore = create<AjustesState>((set, get) => {
  const actuales = (): Ajustes => {
    const { cargado: _c, cargar: _l, cambiar: _m, restablecer: _r, ...a } = get();
    return a;
  };

  return {
    ...AJUSTES_PREDETERMINADOS,
    cargado: false,

    cargar: () => {
      if (get().cargado) return;
      const a = leer();
      set({ ...a, cargado: true });
      aplicarAjustes(a);
      // Con "Sistema", el tema sigue al de Windows aunque cambie con la aplicación abierta.
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (get().tema === "sistema") aplicarAjustes(actuales());
      });
    },

    cambiar: (parcial) => {
      set(parcial);
      const a = actuales();
      guardar(a);
      aplicarAjustes(a);
    },

    restablecer: () => {
      set({ ...AJUSTES_PREDETERMINADOS });
      guardar(AJUSTES_PREDETERMINADOS);
      aplicarAjustes(AJUSTES_PREDETERMINADOS);
    },
  };
});
