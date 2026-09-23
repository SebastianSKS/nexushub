import { abrirExterno } from "@/lib/entorno";
import type { Acceso } from "@/store/accesos-store";
import { abrirApp } from "./apps";

/**
 * Abre un acceso: si tiene un programa instalado, ese (como si lo pulsaras en el menú Inicio); si no se pudo, o no
 * hay programa, la página web. Devuelve false solo si no había nada que abrir.
 */
export async function abrirAcceso(a: Acceso): Promise<boolean> {
  if (a.app) {
    try {
      await abrirApp(a.app.id);
      return true;
    } catch {
      /* el programa ya no está o no abrió: se prueba con la web */
    }
  }
  if (a.url) {
    await abrirExterno(a.url);
    return true;
  }
  return false;
}
