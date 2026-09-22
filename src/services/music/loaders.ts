let embedApi: Promise<SpotifyIFrameAPI> | null = null;
let sdkReady: Promise<void> | null = null;

function inject(src: string, onError: () => void) {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.onerror = onError;
  document.head.appendChild(script);
}

/** Carga la iFrame API del embed de Spotify (una sola vez). */
export function loadSpotifyEmbedApi(): Promise<SpotifyIFrameAPI> {
  if (embedApi) return embedApi;
  embedApi = new Promise<SpotifyIFrameAPI>((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    inject("https://open.spotify.com/embed/iframe-api/v1", () => {
      embedApi = null; // permite reintentar
      reject(new Error("No se pudo cargar el reproductor de Spotify"));
    });
  });
  return embedApi;
}

/** Carga el Web Playback SDK (solo Modo Conectado). */
export function loadSpotifySdk(): Promise<void> {
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkReady) return sdkReady;
  sdkReady = new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    inject("https://sdk.scdn.co/spotify-player.js", () => {
      sdkReady = null;
      reject(new Error("No se pudo cargar el SDK de Spotify"));
    });
  });
  return sdkReady;
}
