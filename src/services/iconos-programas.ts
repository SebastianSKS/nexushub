import { create } from "zustand";
import { normalize } from "@/lib/text";
import { iconosDeApps, listarApps, type AppInstalada } from "@/services/apps";

/**
 * Los logos ORIGINALES de los programas que Nexo menciona (Word, Excel, PowerPoint, Bloc de notas, el visor de PDF…): se
 * los pedimos a Windows tal como los muestra, así siempre son los de verdad y los de la versión que el usuario tiene
 * instalada. Se guardan para no volver a pedirlos. Si el programa no está instalado, quien dibuja usa su inicial en un
 * cuadro de color.
 *
 * Para un programa nuevo: añade su clave y cómo se reconoce en `PROGRAMAS` (o, si es un tipo de archivo, en `TIPOS`);
 * el resto es igual.
 */

export type ClavePrograma = "word" | "excel" | "powerpoint" | "texto" | "pdf";

/** Los programas del menú Inicio, y cómo se reconoce cada uno: por su nombre o por su identificador. */
const PROGRAMAS: Partial<Record<ClavePrograma, { nombres: string[]; id: RegExp }>> = {
  word: { nombres: ["word", "microsoft word"], id: /WINWORD/i },
  excel: { nombres: ["excel", "microsoft excel"], id: /EXCEL\.EXE/i },
  powerpoint: { nombres: ["powerpoint", "microsoft powerpoint"], id: /POWERPNT/i },
  texto: { nombres: ["bloc de notas", "notepad"], id: /Notepad/i },
};

/** Lo que no es un programa sino el tipo de archivo, con la extensión que se le pide a Windows: el icono es el del programa que lo abre. */
const TIPOS: Partial<Record<ClavePrograma, string>> = { pdf: "pdf" };

/** Color de marca y letra de cada programa, para el cuadro de reserva cuando no está instalado. */
export const RESERVA_PROGRAMA: Record<ClavePrograma, { color: string; inicial: string }> = {
  word: { color: "#2B579A", inicial: "W" },
  excel: { color: "#217346", inicial: "X" },
  powerpoint: { color: "#B7472A", inicial: "P" },
  texto: { color: "#5D6870", inicial: "T" },
  pdf: { color: "#D93025", inicial: "PDF" },
};

/** El programa que abre una extensión («.docx» → Word), si es uno de los que conocemos. */
export function programaDeExtension(nombreArchivo: string): ClavePrograma | null {
  const ext = /\.([a-z0-9]+)$/i.exec(nombreArchivo)?.[1]?.toLowerCase();
  if (ext === "docx" || ext === "doc") return "word";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "pptx" || ext === "ppt") return "powerpoint";
  if (ext === "txt") return "texto";
  if (ext === "pdf") return "pdf";
  return null;
}

const CLAVE_ALMACEN = "nexo-iconos-programas";
const PNG = "data:image/png;base64,";

function leer(): Record<string, string> {
  try {
    const datos = JSON.parse(window.localStorage.getItem(CLAVE_ALMACEN) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(datos).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].startsWith(PNG) && e[1].length < 200_000));
  } catch {
    return {};
  }
}

interface Estado {
  /** clave → imagen (data URL PNG). */
  iconos: Record<string, string>;
  cargado: boolean;
}

export const useIconosProgramas = create<Estado>(() => ({ iconos: {}, cargado: false }));

const reconocer = (clave: ClavePrograma, app: AppInstalada) => {
  const p = PROGRAMAS[clave];
  return !!p && (p.nombres.includes(normalize(app.nombre).trim()) || p.id.test(app.id));
};

/** El icono que Windows muestra para un tipo de archivo (el del programa que lo abre), o null. */
async function iconoDeTipo(extension: string): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const b64 = await invoke<string | null>("icono_de_tipo", { extension });
    return b64 ? `${PNG}${b64}` : null;
  } catch {
    return null;
  }
}

let pedido: Promise<void> | null = null;

/** Trae los logos que aún no se tienen (los guardados de otras veces salen al instante). Se puede llamar las veces que sea. */
export function cargarIconosProgramas(claves: ClavePrograma[]): Promise<void> {
  if (!useIconosProgramas.getState().cargado) useIconosProgramas.setState({ iconos: leer(), cargado: true });
  const faltan = claves.filter((c) => !useIconosProgramas.getState().iconos[c]);
  if (faltan.length === 0) return Promise.resolve();
  pedido = (pedido ?? Promise.resolve()).then(async () => {
    const aun = faltan.filter((c) => !useIconosProgramas.getState().iconos[c]);
    if (aun.length === 0) return;
    const nuevos: Record<string, string> = {};

    // Los tipos de archivo (PDF): el icono del programa que los abre.
    for (const c of aun) {
      const ext = TIPOS[c];
      const icono = ext ? await iconoDeTipo(ext) : null;
      if (icono) nuevos[c] = icono;
    }

    // Los programas del menú Inicio (Word, Excel…).
    const deApp = aun.filter((c) => PROGRAMAS[c]);
    if (deApp.length > 0) {
      const apps = await listarApps();
      const porClave = new Map<ClavePrograma, AppInstalada>();
      for (const c of deApp) {
        const app = apps.find((a) => reconocer(c, a));
        if (app) porClave.set(c, app);
      }
      if (porClave.size > 0) {
        const imagenes = await iconosDeApps([...new Set([...porClave.values()].map((a) => a.id))]);
        for (const [c, app] of porClave) if (imagenes[app.id]) nuevos[c] = imagenes[app.id];
      }
    }

    if (Object.keys(nuevos).length === 0) return;
    const iconos = { ...useIconosProgramas.getState().iconos, ...nuevos };
    useIconosProgramas.setState({ iconos });
    try {
      window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(iconos));
    } catch {
      /* sin almacenamiento: se vuelven a pedir la próxima vez */
    }
  });
  return pedido;
}
