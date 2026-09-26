import { useCallback } from "react";
import { create } from "zustand";
import { CLAVE_AJUSTES, useAjustesStore } from "@/store/ajustes-store";
import { en } from "./en";
import { leerPreferencia, localeDe, resolverIdioma, traducirDe, type Idioma, type PreferenciaIdioma, type Variables } from "./nucleo";

export { IDIOMAS, NOMBRE_IDIOMA, T, localeDe, type Idioma, type PreferenciaIdioma, type Variables } from "./nucleo";

interface IdiomaState {
  /** El idioma con el que se muestra todo ahora. */
  idioma: Idioma;
  /** Lee la preferencia guardada y la aplica (una vez, antes de dibujar nada) y se queda atento a los cambios. */
  cargar: () => void;
  /** Aplica una preferencia: cambia el idioma de toda la ventana. */
  aplicar: (preferencia: PreferenciaIdioma) => void;
}

const delSistema = () => (typeof navigator === "undefined" ? null : navigator.language);

let escuchando = false;

export const useIdiomaStore = create<IdiomaState>((set, get) => ({
  idioma: "es",

  aplicar: (preferencia) => {
    const idioma = resolverIdioma(preferencia, delSistema());
    if (idioma !== get().idioma) set({ idioma });
    if (typeof document !== "undefined") document.documentElement.lang = idioma;
  },

  cargar: () => {
    let crudo: string | null = null;
    try {
      crudo = window.localStorage.getItem(CLAVE_AJUSTES);
    } catch {
      /* almacenamiento bloqueado: se usa el idioma del sistema */
    }
    get().aplicar(leerPreferencia(crudo));
    if (escuchando) return;
    escuchando = true;
    // Al cambiar el ajuste en Configuración, toda la ventana cambia de idioma al instante.
    useAjustesStore.subscribe((estado, previo) => estado.idioma !== previo.idioma && get().aplicar(estado.idioma));
  },
}));

/** Traduce desde cualquier parte (no necesita ser un componente): usa el idioma de ahora mismo. */
export function traducir(clave: string, variables?: Variables): string {
  return traducirDe(en, useIdiomaStore.getState().idioma, clave, variables);
}

/**
 * Para los componentes: devuelve `t` y hace que el componente se vuelva a dibujar cuando cambia el idioma.
 * Úsalo así: `const t = useT();` … `t("Guardar")`, `t("Hola, {nombre}", { nombre })`.
 */
export function useT(): (clave: string, variables?: Variables) => string {
  const idioma = useIdiomaStore((s) => s.idioma);
  return useCallback((clave, variables) => traducirDe(en, idioma, clave, variables), [idioma]);
}

/** El idioma de ahora, para lo que depende de él (fechas, números). */
export const useIdioma = (): Idioma => useIdiomaStore((s) => s.idioma);

/** El código de idioma de ahora («es-MX» / «en-US») para `toLocaleString` y compañía, desde cualquier parte. */
export const localeActual = (): string => localeDe(useIdiomaStore.getState().idioma);
