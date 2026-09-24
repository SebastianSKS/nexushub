import { esEscritorio } from "@/lib/entorno";

/** Un programa instalado en el equipo, tal como lo lista el menú Inicio de Windows. */
export interface AppInstalada {
  nombre: string;
  /** Identificador con el que se abre (no es para mostrar). */
  id: string;
}

let cache: Promise<AppInstalada[]> | null = null;

/** Los programas instalados (solo en la aplicación de escritorio de Windows). Se lee una vez por sesión; `forzar` vuelve a leer. */
export function listarApps(forzar = false): Promise<AppInstalada[]> {
  if (!esEscritorio()) return Promise.resolve([]);
  if (!cache || forzar) {
    cache = import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<AppInstalada[]>("apps_instaladas"))
      .catch(() => {
        cache = null; // que se pueda reintentar
        return [];
      });
  }
  return cache;
}

/** Abre un programa instalado. Lanza si no se pudo. */
export async function abrirApp(id: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("abrir_app", { id });
}

/** Los iconos reales de varios programas (data URL PNG), tal como Windows los muestra. Los que no se pudieron sacar no vienen. */
export async function iconosDeApps(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const png = await invoke<Record<string, string>>("iconos_de_apps", { ids });
    return Object.fromEntries(Object.entries(png).map(([id, b64]) => [id, `data:image/png;base64,${b64}`]));
  } catch {
    return {};
  }
}
