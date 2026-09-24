import { esEscritorio } from "@/lib/entorno";

export type PermisoNotificaciones = "granted" | "denied" | "default" | "no-soportado";

/**
 * Notificaciones del sistema. En la aplicación de escritorio son notificaciones de Windows de verdad (las que
 * aparecen en la esquina y se quedan en el Centro de notificaciones); una página web dentro de la ventana no
 * puede mostrarlas por sí sola, por eso se piden al programa. En el navegador se usa la API web.
 */

export async function permisoNotificaciones(): Promise<PermisoNotificaciones> {
  if (esEscritorio()) {
    try {
      const { isPermissionGranted } = await import("@tauri-apps/plugin-notification");
      return (await isPermissionGranted()) ? "granted" : "default";
    } catch {
      return "no-soportado";
    }
  }
  return typeof Notification === "undefined" ? "no-soportado" : Notification.permission;
}

export async function pedirPermisoNotificaciones(): Promise<PermisoNotificaciones> {
  if (esEscritorio()) {
    try {
      const { requestPermission } = await import("@tauri-apps/plugin-notification");
      return (await requestPermission()) === "granted" ? "granted" : "denied";
    } catch {
      return "no-soportado";
    }
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return permisoNotificaciones();
  }
}

/** Envía una notificación del sistema, si hay permiso. Devuelve true si se envió. */
export async function notificarSistema(titulo: string, cuerpo: string, etiqueta?: string, ruta?: string): Promise<boolean> {
  if (esEscritorio()) {
    // Con una ruta, el aviso lo muestra el programa para poder llevar a esa sección al hacer clic (ver avisos.rs).
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("notificar", { titulo, cuerpo, ruta: ruta ?? null });
      return true;
    } catch {
      /* sin esa vía (otro sistema): se usa el plugin de notificaciones */
    }
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
      if (!(await isPermissionGranted()) && (await requestPermission()) !== "granted") return false;
      sendNotification({ title: titulo, body: cuerpo, sound: "Default" });
      return true;
    } catch {
      return false;
    }
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    new Notification(titulo, { body: cuerpo, tag: etiqueta, silent: false });
    return true;
  } catch {
    return false;
  }
}
