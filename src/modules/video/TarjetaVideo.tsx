"use client";

import clsx from "clsx";
import { Add20Regular, Checkmark20Regular, Open24Regular, Play24Filled } from "@fluentui/react-icons";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { abrirExterno } from "@/lib/entorno";
import { fechaRelativa } from "@/lib/canales/fecha";
import { formatDuration } from "@/lib/video/format";
import { useProgresoVideoStore } from "@/store/progreso-video-store";
import type { VideoCanal } from "@/types/canal";

interface TarjetaVideoProps {
  video: VideoCanal;
  /** Es el video que suena ahora. */
  activo: boolean;
  enCola: boolean;
  incrustable: boolean;
  favorito: boolean;
  /** Segundos, si ya se conocen (el feed no los trae). null = no se muestra el badge. */
  duracion: number | null;
  onReproducir: () => void;
  onEncolar: () => void;
  onAlternarFavorito: () => void;
}

/**
 * Tarjeta de video. Un video que no se puede incrustar se ve atenuado, con el badge
 * «Solo en YouTube», y al pulsarlo abre YouTube en otra pestaña en vez de intentar reproducirlo.
 */
export function TarjetaVideo({ video, activo, enCola, incrustable, favorito, duracion, onReproducir, onEncolar, onAlternarFavorito }: TarjetaVideoProps) {
  const meta = [video.canalNombre, fechaRelativa(video.publicado)].filter(Boolean).join(" · ");
  // Cuánto va visto (la barra roja de abajo de la miniatura, como en YouTube).
  const visto = useProgresoVideoStore((s) => s.progreso[video.videoId]);
  const urlYouTube = `https://www.youtube.com/watch?v=${video.videoId}`;

  const abrir = () => {
    if (incrustable) onReproducir();
    else void abrirExterno(urlYouTube);
  };

  return (
    <div
      className={clsx(
        "rounded-control reveal group relative border bg-layer p-2 shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt",
        activo ? "border-accent" : "border-stroke",
      )}
    >
      <button
        type="button"
        onClick={abrir}
        aria-label={
          incrustable ? `Reproducir ${video.titulo}, de ${video.canalNombre}` : `Abrir en YouTube: ${video.titulo}, de ${video.canalNombre}`
        }
        aria-current={activo ? "true" : undefined}
        className="block w-full text-left"
      >
        <span className="relative block aspect-video w-full overflow-hidden rounded-control bg-layer-alt">
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota de YouTube */}
          <img
            src={video.miniatura}
            alt=""
            loading="lazy"
            draggable={false}
            className={clsx(
              "h-full w-full object-cover transition-[transform,opacity] duration-enter ease-fluent",
              incrustable ? "group-hover:scale-[1.03]" : "opacity-50",
            )}
          />

          {/* Botón superpuesto que aparece al pasar el cursor */}
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-enter ease-fluent group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-on shadow-flyout">
              {incrustable ? <Play24Filled /> : <Open24Regular />}
            </span>
          </span>

          {!incrustable && (
            <span
              className="absolute left-1.5 top-1.5 rounded-[4px] px-1.5 py-0.5 text-caption font-semibold"
              style={{ backgroundColor: "var(--warning)", color: "#000000" }}
            >
              Solo en YouTube
            </span>
          )}
          {activo && incrustable && (
            <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-accent px-1.5 py-0.5 text-caption font-semibold text-accent-on" aria-hidden>
              Reproduciendo
            </span>
          )}
          {visto && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-black/50" title={`Vas en ${formatDuration(visto.t)}`}>
              <span className="block h-full bg-[#ff0000]" style={{ width: `${Math.min(100, (visto.t / visto.d) * 100)}%` }} />
            </span>
          )}
          {duracion !== null && (
            <span
              className="tabular absolute bottom-1.5 right-1.5 rounded-[4px] px-1.5 py-0.5 text-caption font-semibold text-white"
              style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
            >
              {formatDuration(duracion)}
            </span>
          )}
        </span>

        <span className="mt-2 block px-1 pb-1">
          <span className="line-clamp-2 block text-body font-semibold text-fg" title={video.titulo}>
            {video.titulo}
          </span>
          <span className="mt-1 block truncate text-caption text-fg-secondary" title={meta}>
            {meta}
          </span>
        </span>
      </button>

      <div className="absolute right-3.5 top-3.5 flex gap-1">
        <IconButton
          label={favorito ? "Quitar de favoritos" : "Añadir a favoritos"}
          onClick={onAlternarFavorito}
          className={clsx(
            "acrylic h-8 w-8 text-fg transition-opacity duration-exit ease-fluent focus-visible:opacity-100 group-hover:opacity-100",
            favorito ? "text-accent-text opacity-100" : "opacity-0",
          )}
        >
          <Glifo nombre={favorito ? "favoritoLleno" : "favorito"} tam={14} />
        </IconButton>
        {incrustable && (
          <button
            type="button"
            onClick={onEncolar}
            disabled={enCola}
            aria-label={enCola ? `${video.titulo} ya está en la cola` : `Añadir a la cola: ${video.titulo}`}
            title={enCola ? "En la cola" : "Añadir a la cola"}
            className={clsx(
              "acrylic flex h-8 w-8 items-center justify-center rounded-control text-fg",
              "transition-opacity duration-exit ease-fluent focus-visible:opacity-100 group-hover:opacity-100",
              enCola ? "opacity-100" : "opacity-0",
            )}
          >
            {enCola ? <Checkmark20Regular /> : <Add20Regular />}
          </button>
        )}
      </div>
    </div>
  );
}
