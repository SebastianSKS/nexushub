import { create } from "zustand";
import { normalize } from "@/lib/text";
import { iconosDeApps, listarApps, type AppInstalada } from "@/services/apps";

/**
 * Los logos ORIGINALES de los programas que Nexo menciona (Word, Excel, PowerPoint, Bloc de notas…): se los pedimos a
 * Windows tal como los muestra el menú Inicio, así siempre son los de verdad y los de la versión que el usuario tiene
 * instalada. Se guardan para no volver a pedirlos. Si el programa no está instalado, quien dibuja usa su inicial en un
 * cuadro de color.
 *
 * Para un programa nuevo: añade su clave y cómo se reconoce en `PROGRAMAS`; el resto es igual.
 */

export type ClavePrograma = "word" | "excel" | "powerpoint" | "texto";

/** Cómo se reconoce cada programa entre los instalados: por su nombre en el menú Inicio o por su identificador. */
const PROGRAMAS: Record<ClavePrograma, { nombres: string[]; id: RegExp }> = {
  word: { nombres: ["word", "microsoft word"], id: /WINWORD/i },
  excel: { nombres: ["excel", "microsoft excel"], id: /EXCEL\.EXE/i },
  powerpoint: { nombres: ["powerpoint", "microsoft powerpoint"], id: /POWERPNT/i },
  texto: { nombres: ["bloc de notas", "notepad"], id: /Notepad/i },
};

/** Color de marca y letra de cada programa, para el cuadro de reserva cuando no está instalado. */
export const RESERVA_PROGRAMA: Record<ClavePrograma, { color: string; inicial: string }> = {
  word: { color: "#2B579A", inicial: "W" },
  excel: { color: "#217346", inicial: "X" },
  powerpoint: { color: "#B7472A", inicial: "P" },
  texto: { color: "#5D6870", inicial: "T" },
};

/** El programa que abre una extensión («.docx» → Word), si es uno de los que conocemos. */
export function programaDeExtension(nombreArchivo: string): ClavePrograma | null {
  const ext = /\.([a-z0-9]+)$/i.exec(nombreArchivo)?.[1]?.toLowerCase();
  if (ext === "docx" || ext === "doc") return "word";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "pptx" || ext === "ppt") return "powerpoint";
  if (ext === "txt") return "texto";
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

const reconocer = (clave: ClavePrograma, app: AppInstalada) => PROGRAMAS[clave].nombres.includes(normalize(app.nombre).trim()) || PROGRAMAS[clave].id.test(app.id);

let pedido: Promise<void> | null = null;

/** Trae los logos que aún no se tienen (los guardados de otras veces salen al instante). Se puede llamar las veces que sea. */
export function cargarIconosProgramas(claves: ClavePrograma[]): Promise<void> {
  if (!useIconosProgramas.getState().cargado) useIconosProgramas.setState({ iconos: leer(), cargado: true });
  const faltan = claves.filter((c) => !useIconosProgramas.getState().iconos[c]);
  if (faltan.length === 0) return Promise.resolve();
  pedido = (pedido ?? Promise.resolve()).then(async () => {
    const aun = faltan.filter((c) => !useIconosProgramas.getState().iconos[c]);
    if (aun.length === 0) return;
    const apps = await listarApps();
    const porClave = new Map<ClavePrograma, AppInstalada>();
    for (const c of aun) {
      const app = apps.find((a) => reconocer(c, a));
      if (app) porClave.set(c, app);
    }
    if (porClave.size === 0) return;
    const imagenes = await iconosDeApps([...new Set([...porClave.values()].map((a) => a.id))]);
    const nuevos: Record<string, string> = {};
    for (const [c, app] of porClave) if (imagenes[app.id]) nuevos[c] = imagenes[app.id];
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
