import type { Pista } from "@/store/reproductor-store";
import type { VideoCanal } from "@/types/canal";

/** Un video de canal → la pista que entiende el reproductor global. */
export function pistaDeVideo(v: VideoCanal, duraciones: Record<string, number>): Pista {
  return {
    id: v.videoId,
    titulo: v.titulo,
    artista: v.canalNombre,
    caratula: v.miniatura,
    duracion: duraciones[v.videoId] ?? 0,
    fuente: "youtube",
  };
}
