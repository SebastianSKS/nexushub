/** Tipos mínimos de la IFrame Player API de YouTube (solo lo que usa Nexo). */
declare namespace YT {
  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };

  interface PlayerEvent {
    target: Player;
  }
  interface OnStateChangeEvent extends PlayerEvent {
    data: number;
  }
  interface OnErrorEvent extends PlayerEvent {
    data: number;
  }

  interface OnPlaybackRateChangeEvent extends PlayerEvent {
    /** La velocidad nueva (0.25 a 2). */
    data: number;
  }

  interface PlayerOptions {
    width?: string | number;
    height?: string | number;
    videoId?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (e: PlayerEvent) => void;
      onStateChange?: (e: OnStateChangeEvent) => void;
      onError?: (e: OnErrorEvent) => void;
      onPlaybackRateChange?: (e: OnPlaybackRateChangeEvent) => void;
    };
  }

  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    loadVideoById(videoId: string | { videoId: string; startSeconds?: number }): void;
    cueVideoById(videoId: string | { videoId: string; startSeconds?: number }): void;
    getPlaybackRate(): number;
    setPlaybackRate(rate: number): void;
    playVideo(): void;
    pauseVideo(): void;
    getPlayerState(): number;
    getDuration(): number;
    getCurrentTime(): number;
    setVolume(volume: number): void;
    getVideoData(): { video_id: string; title: string };
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    destroy(): void;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
