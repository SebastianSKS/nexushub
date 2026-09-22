import { create } from "zustand";

export interface RectHueco {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * El «hueco» es el rectángulo que la página /video/ver reserva para el video. El reproductor real vive en
 * un contenedor fijo en la raíz (ContenedorVideo) y se coloca encima de este hueco: así el iframe no se
 * mueve de padre ni se recrea nunca, y el video no se reinicia al navegar.
 */
interface HuecoState {
  rect: RectHueco | null;
  setRect: (r: RectHueco | null) => void;
}

export const useHuecoStore = create<HuecoState>((set, get) => ({
  rect: null,
  setRect: (rect) => {
    const a = get().rect;
    if (a && rect && a.x === rect.x && a.y === rect.y && a.ancho === rect.ancho && a.alto === rect.alto) return;
    set({ rect });
  },
}));
