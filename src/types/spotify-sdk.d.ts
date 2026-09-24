/** Tipos mínimos de la iFrame API (embed) y del Web Playback SDK de Spotify. */

interface SpotifyEmbedEvent {
  data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number };
}
interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: "ready", cb: () => void): void;
  addListener(event: "playback_update", cb: (e: SpotifyEmbedEvent) => void): void;
}
interface SpotifyIFrameAPI {
  createController(
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

declare namespace Spotify {
  interface Image {
    url: string;
  }
  interface Track {
    uri: string;
    id: string | null;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: Image[] };
    duration_ms: number;
    /** Si Spotify sustituye la pista pedida por otra equivalente de tu país, aquí viene la pedida. */
    linked_from?: { uri: string | null; id: string | null };
  }
  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    shuffle: boolean;
    repeat_mode: 0 | 1 | 2;
    track_window: { current_track: Track; previous_tracks: Track[] };
  }
  interface WebPlaybackError {
    message: string;
  }
  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }
  class Player {
    constructor(init: PlayerInit);
    connect(): Promise<boolean>;
    disconnect(): void;
    togglePlay(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    activateElement(): Promise<void>;
    addListener(event: "ready" | "not_ready", cb: (e: { device_id: string }) => void): void;
    addListener(event: "player_state_changed", cb: (s: PlaybackState | null) => void): void;
    addListener(
      event: "initialization_error" | "authentication_error" | "account_error" | "playback_error",
      cb: (e: WebPlaybackError) => void,
    ): void;
  }
}

interface Window {
  onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: typeof Spotify;
}
