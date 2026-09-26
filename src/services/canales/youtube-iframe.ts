import { traducir } from "@/lib/i18n";
const SCRIPT_URL = "https://www.youtube.com/iframe_api";

let cargando: Promise<typeof YT> | null = null;

/** Carga la IFrame Player API una sola vez y resuelve cuando `YT.Player` está listo. */
export function cargarApiYouTube(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (cargando) return cargando;

  cargando = new Promise<typeof YT>((resolve, reject) => {
    const previo = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previo?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YT no disponible"));
    };
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => {
      cargando = null; // permite reintentar
      reject(new Error(traducir("No se pudo cargar la API de YouTube")));
    };
    document.head.appendChild(script);
  });
  return cargando;
}

/** El reproductor vivo, accesible para el panel de desarrollo. null si no hay uno. */
let reproductor: YT.Player | null = null;
export const fijarReproductor = (p: YT.Player | null) => {
  reproductor = p;
};
export const obtenerReproductor = () => reproductor;
