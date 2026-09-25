/**
 * ¿Se está ejecutando dentro de la aplicación de escritorio (Tauri)?
 * Tauri 2 expone `window.__TAURI_INTERNALS__`. Fuera de él (navegador, `npm run dev`) las
 * funciones que solo existen en escritorio (minimizar, "Guardar como" nativo…) no se ofrecen.
 */
export function esEscritorio(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Abre un enlace externo (YouTube, Spotify…) con el programa del sistema. En la aplicación de
 * escritorio, un enlace normal se quedaría atrapado dentro de la ventana de Nexo: hay que
 * pedírselo a Tauri explícitamente. En el navegador, una pestaña nueva de toda la vida.
 */
export async function abrirExterno(url: string): Promise<void> {
  if (esEscritorio()) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
