import { create } from "zustand";

export type PreferenciaTema = "claro" | "oscuro" | "sistema";
export type EfectoVentana = "mica" | "acrilico" | "ninguno";
export type AlTerminar = "nada" | "descargar" | "abrir-carpeta";
/** Con qué pantalla se abre NexusHub: la última que se estaba usando, o una sección fija. */
export type SeccionInicial = "inicio" | "ultima" | "video" | "musica" | "documentos" | "calendario";

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
  /** Al terminar un video, pasar solo al siguiente de la cola. */
  siguienteAutomatico: boolean;
  /** Minutos antes de cada clase para avisar (0 = no avisar). */
  avisoClaseMin: number;
  /** Un resumen de lo que tienes hoy, a la hora elegida. */
  resumenDia: boolean;
  /** Hora (0-23) del resumen del día. */
  resumenHora: number;
  seccionInicial: SeccionInicial;
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
  siguienteAutomatico: true,
  avisoClaseMin: 10,
  resumenDia: true,
  resumenHora: 6,
  seccionInicial: "inicio",
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
      siguienteAutomatico: d.siguienteAutomatico !== false,
      avisoClaseMin: typeof d.avisoClaseMin === "number" && [0, 5, 10, 15, 30].includes(d.avisoClaseMin) ? d.avisoClaseMin : 10,
      resumenDia: d.resumenDia !== false,
      resumenHora: typeof d.resumenHora === "number" && Number.isInteger(d.resumenHora) && d.resumenHora >= 0 && d.resumenHora <= 13 ? d.resumenHora : 6,
      seccionInicial: d.seccionInicial === "ultima" || d.seccionInicial === "video" || d.seccionInicial === "musica" || d.seccionInicial === "documentos" || d.seccionInicial === "calendario" ? d.seccionInicial : "inicio",
    };
  } catch {
    return AJUSTES_PREDETERMINADOS; // almacenamiento bloqueado o JSON dañado: se usan los valores por defecto
  }
}

/** Lectura suelta del ajuste: la pantalla de arranque decide adónde ir antes de que el store se cargue. */
export function leerSeccionInicial(): SeccionInicial {
  return leer().seccionInicial;
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
