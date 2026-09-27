import { create } from "zustand";
import { esEscritorio } from "@/lib/entorno";
import { traducir } from "@/lib/i18n";
import { normalizarVistos, puedeMostrarse, type ConsejoId } from "@/lib/consejos";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCalendarioStore } from "@/store/calendario-store";
import { useGuiasStore } from "@/store/guias-store";
import { useNovedadesStore } from "@/store/novedades-store";

/** Los consejos que ya se mostraron. Empieza con «nexushub-»: entra en la copia de seguridad. */
export const CLAVE_CONSEJOS = "nexushub-consejos-vistos";

function leerVistas(): ConsejoId[] {
  try {
    return normalizarVistos(JSON.parse(window.localStorage.getItem(CLAVE_CONSEJOS) ?? "[]"));
  } catch {
    return [];
  }
}

interface ConsejosState {
  vistos: ConsejoId[];
  cargado: boolean;
  /** Cuándo salió el último (solo de esta sesión). */
  ultimoEn: number;
  cargar: () => void;
  /**
   * La persona acaba de hacer algo por primera vez: si toca, muestra el consejo de eso (una sola vez, sin pisar guías ni
   * novedades, sin apilarse con otro consejo y solo si los consejos están activos).
   */
  ofrecer: (id: ConsejoId) => void;
  /** Vuelve a permitir todos (desde Configuración). */
  reiniciar: () => void;
}

/** El texto y el enlace de cada consejo (con los números de Configuración ya puestos). */
function contenido(id: ConsejoId): { titulo: string; texto: string; ruta: string; etiqueta: string; glifo: "reloj" | "calendario" | "carpeta" | "documentos" } {
  const a = useAjustesStore.getState();
  switch (id) {
    case "primera-clase":
      return {
        titulo: traducir("Tu horario ya está en Nexo"),
        texto: a.avisoClaseMin > 0 ? traducir("Te avisaremos {n} minutos antes de cada clase. Lo cambias en Configuración › Avisos.", { n: a.avisoClaseMin }) : traducir("Los avisos de clase están apagados; puedes encenderlos en Configuración › Avisos."),
        ruta: "/configuracion",
        etiqueta: traducir("Ir a Configuración"),
        glifo: "reloj",
      };
    case "primer-evento-con-hora":
      return {
        titulo: traducir("Listo, ya tienes un evento con hora"),
        texto: a.avisoEventoMin > 0 ? traducir("Te avisaremos {n} minutos antes de que empiece. Lo cambias en Configuración › Avisos.", { n: a.avisoEventoMin }) : traducir("El aviso antes de los eventos con hora está apagado; puedes encenderlo en Configuración › Avisos."),
        ruta: "/configuracion",
        etiqueta: traducir("Ir a Configuración"),
        glifo: "calendario",
      };
    case "primera-carpeta":
      return {
        titulo: traducir("Tus materias ya tienen carpeta"),
        texto: traducir("Guarda ahí tus tareas. Con Ctrl+K puedes buscar una palabra dentro de sus PDF, Word, Excel y PowerPoint."),
        ruta: "/documentos/carpetas",
        etiqueta: traducir("Ver mis tareas"),
        glifo: "carpeta",
      };
    case "primer-resultado":
      return {
        titulo: traducir("Tu primer archivo está listo"),
        texto: esEscritorio() ? traducir("Todo se hizo en tu computadora: tus archivos no salieron a internet.") : traducir("Todo se hizo en tu navegador: tus archivos no salieron a internet."),
        ruta: "/documentos",
        etiqueta: traducir("Ver más herramientas"),
        glifo: "documentos",
      };
  }
}

export const useConsejosStore = create<ConsejosState>((set, get) => ({
  vistos: [],
  cargado: false,
  ultimoEn: 0,

  cargar: () => {
    if (get().cargado) return;
    set({ vistos: leerVistas(), cargado: true });
  },

  ofrecer: (id) => {
    get().cargar();
    const algoAbierto = useGuiasStore.getState().abierta !== null || useNovedadesStore.getState().abiertas !== null;
    const ahora = Date.now();
    if (!puedeMostrarse(id, { vistos: get().vistos, algoAbierto, ultimoEn: get().ultimoEn, ahora, activos: useAjustesStore.getState().consejos })) return;
    const c = contenido(id);
    useCalendarioStore.getState().mostrarAviso({ titulo: c.titulo, texto: c.texto, destino: { ruta: c.ruta, etiqueta: c.etiqueta, glifo: c.glifo }, autocerrar: 12_000 });
    const vistos = [...get().vistos, id];
    set({ vistos, ultimoEn: ahora });
    try {
      window.localStorage.setItem(CLAVE_CONSEJOS, JSON.stringify(vistos));
    } catch {
      /* sin almacenamiento: puede volver a salir la próxima vez, sin mayor problema */
    }
  },

  reiniciar: () => {
    set({ vistos: [], ultimoEn: 0 });
    try {
      window.localStorage.removeItem(CLAVE_CONSEJOS);
    } catch {
      /* nada que hacer */
    }
  },
}));
