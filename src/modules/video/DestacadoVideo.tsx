"use client";

import { Add20Regular, Checkmark20Regular, Play20Filled } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { useColoresCaratula } from "@/hooks/useColoresCaratula";
import { fechaRelativa } from "@/lib/canales/fecha";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/video/format";
import { useCanalesStore } from "@/store/canales-store";
import { useProgresoVideoStore } from "@/store/progreso-video-store";
import type { VideoCanal } from "@/types/canal";
import { AvatarCanal } from "./AvatarCanal";

interface DestacadoVideoProps {
  video: VideoCanal;
  duracion: number | null;
  activo: boolean;
  enCola: boolean;
  onReproducir: () => void;
  onEncolar: () => void;
}

/**
 * El video más nuevo de tus canales, en grande al principio del muro. El panel toma los colores de su miniatura, así
 * cada día se ve distinto. Si no caben lado a lado, la miniatura va arriba y el texto abajo.
 */
export function DestacadoVideo({ video, duracion, activo, enCola, onReproducir, onEncolar }: DestacadoVideoProps) {
  const t = useT();
  const avatar = useCanalesStore((s) => s.canales.find((c) => c.id === video.canalId)?.avatar ?? null);
  const visto = useProgresoVideoStore((s) => s.progreso[video.videoId]);
  const colores = useColoresCaratula(video.miniatura);

  return (
    <article className="relative flex flex-wrap overflow-hidden rounded-[14px] border border-stroke bg-layer">
      {colores && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{ backgroundImage: `radial-gradient(120% 140% at 100% 0%, rgb(${colores[0].join(" ")}) 0%, transparent 62%), radial-gradient(90% 120% at 62% 120%, rgb(${colores[1].join(" ")}) 0%, transparent 70%)` }}
        />
      )}
      <button
        type="button"
        onClick={onReproducir}
        tabIndex={-1}
        aria-hidden
        className="group relative aspect-video min-w-0 flex-[3_1_290px] overflow-hidden bg-layer-alt"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota de YouTube */}
        <img src={video.miniatura} alt="" draggable={false} className="h-full w-full object-cover transition-transform duration-enter ease-fluent group-hover:scale-[1.03]" />
        {duracion !== null && (
          <span className="tabular absolute bottom-2 right-2 rounded-[4px] px-1.5 py-0.5 text-caption font-semibold text-white" style={{ backgroundColor: "rgba(0,0,0,0.78)" }}>
            {formatDuration(duracion)}
          </span>
        )}
        {visto && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <span className="block h-full bg-[#ff0000]" style={{ width: `${Math.min(100, (visto.t / visto.d) * 100)}%` }} />
          </span>
        )}
      </button>

      <div className="relative flex min-w-0 flex-[2_1_210px] flex-col justify-center gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <AvatarCanal nombre={video.canalNombre} avatar={avatar} tam={36} />
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-fg">{video.canalNombre}</p>
            <p className="text-caption text-fg-secondary">{fechaRelativa(video.publicado)}</p>
          </div>
        </div>
        <h3 className="line-clamp-3 text-subtitle text-fg" title={video.titulo}>
          {video.titulo}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" icon={<Play20Filled />} onClick={onReproducir} aria-label={t("Reproducir {titulo}, de {artista}", { titulo: video.titulo, artista: video.canalNombre })}>
            {activo ? t("Volver al video") : visto ? t("Seguir viendo") : t("Ver ahora")}
          </Button>
          <Button icon={enCola ? <Checkmark20Regular /> : <Add20Regular />} disabled={enCola} onClick={onEncolar}>
            {enCola ? t("En la cola") : t("Añadir a la cola")}
          </Button>
        </div>
      </div>
    </article>
  );
}
