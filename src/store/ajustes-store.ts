import { colorDeTexto } from "@/lib/color";
import { create } from "zustand";

import { ACENTO_PREDETERMINADO, AJUSTES_PREDETERMINADOS, normalizarAjustes, type Ajustes, type SeccionInicial } from "@/lib/ajustes-base";
import { T } from "@/lib/i18n/nucleo";

export {
  ACENTO_PREDETERMINADO,
  AJUSTES_PREDETERMINADOS,
  SECCIONES_OCULTABLES,
  ZOOMS_INTERFAZ,
  type Ajustes,
  type AlTerminar,
  type EfectoVentana,
  type FormatoHora,
  type PreferenciaTema,
  type PrimerDiaSemana,
  type ReducirMovimiento,
  type SeccionInicial,
  type SeccionOcultable,
} from "@/lib/ajustes-base";

/** Acentos de Windows 11 que ofrece la página de Configuración. */
export const ACENTOS: readonly { nombre: string; valor: string }[] = [
  { nombre: T("Azul"), valor: "#0078D4" },
  { nombre: T("Cian"), valor: "#0099BC" },
  { nombre: T("Verde"), valor: "#10893E" },
  { nombre: T("Naranja"), valor: "#CA5010" },
  { nombre: T("Rojo"), valor: "#C42B1C" },
  { nombre: T("Rosa"), valor: "#C239B3" },
  { nombre: T("Violeta"), valor: "#744DA9" },
  { nombre: T("Gris"), valor: "#5D6870" },
];

export const CLAVE_AJUSTES = "nexushub-ajustes";

function leer(): Ajustes {
  try {
    const crudo = window.localStorage.getItem(CLAVE_AJUSTES);
    if (!crudo) return AJUSTES_PREDETERMINADOS;
    return normalizarAjustes(JSON.parse(crudo));
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
  // «sistema» = lo que pida Windows; «reducido» y «normal» mandan sobre Windows.
  root.dataset.movimiento = a.reducirMovimiento === "si" ? "reducido" : a.reducirMovimiento === "no" ? "normal" : "sistema";

  if (a.acento.toLowerCase() === ACENTO_PREDETERMINADO.toLowerCase()) {
    // Acento de Windows por defecto: valores exactos del sistema de diseño.
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-hover");
    root.style.removeProperty("--accent-pressed");
    root.style.removeProperty("--on-accent");
  } else {
    root.style.setProperty("--accent", a.acento);
    root.style.setProperty("--accent-hover", `color-mix(in srgb, ${a.acento} 88%, white)`);
    root.style.setProperty("--accent-pressed", `color-mix(in srgb, ${a.acento} 82%, black)`);
    // Un acento claro (amarillo, verde limón…) necesita texto oscuro encima para leerse.
    root.style.setProperty("--on-accent", colorDeTexto(a.acento));
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
