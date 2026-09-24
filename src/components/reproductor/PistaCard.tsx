"use client";

import { Play24Filled } from "@fluentui/react-icons";
import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { abrirMenuPista } from "@/store/menu-pista-store";
import type { Pista } from "@/store/reproductor-store";

interface PistaCardProps {
  pista: Pista;
  active: boolean;
  favorito: boolean;
  onPlay: () => void;
  onAlternarFavorito: () => void;
}

/** Tarjeta de una pista guardada (favorito o reciente, de Música o de Video): carátula, título, autor y estrella. */
export function PistaCard({ pista, active, favorito, onPlay, onAlternarFavorito }: PistaCardProps) {
  return (
    <div onContextMenu={pista.fuente === "spotify" ? (e) => abrirMenuPista(e, pista) : undefined} className={clsx("rounded-control reveal group relative border bg-layer p-3 shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt", active ? "border-accent" : "border-stroke")}>
      <button type="button" onClick={onPlay} aria-label={`Reproducir ${pista.titulo}, ${pista.artista}`} aria-current={active ? "true" : undefined} className="block w-full text-left">
        <span className="relative block aspect-square w-full overflow-hidden rounded-input bg-layer-alt shadow-card">
          {pista.caratula ? (
            // eslint-disable-next-line @next/next/no-img-element -- carátula remota
            <img src={pista.caratula} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover transition-transform duration-enter ease-fluent group-hover:scale-[1.03]" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Glifo nombre={pista.fuente === "youtube" ? "video" : "musica"} tam={28} className="text-fg-tertiary" />
            </span>
          )}
          <span
            aria-hidden
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-on opacity-0 shadow-flyout transition-[opacity,transform] duration-enter ease-fluent group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ transform: "translateY(6px)" }}
          >
            <Play24Filled />
          </span>
          {active && (
            <span aria-hidden className="absolute left-2 top-2 rounded-[4px] bg-accent px-1.5 py-0.5 text-caption font-semibold text-accent-on">
              Sonando
            </span>
          )}
        </span>
        <span className="mt-3 block">
          <span className="block truncate text-body font-semibold text-fg" title={pista.titulo}>
            {pista.titulo}
          </span>
          <span className="mt-0.5 block truncate text-caption text-fg-secondary" title={pista.artista}>
            {pista.artista}
          </span>
        </span>
      </button>
      <IconButton
        label={favorito ? "Quitar de favoritos" : "Añadir a favoritos"}
        onClick={onAlternarFavorito}
        className={clsx("absolute right-4 top-4 bg-layer/80 backdrop-blur-sm", favorito ? "text-accent-text" : "text-fg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")}
      >
        <Glifo nombre={favorito ? "favoritoLleno" : "favorito"} tam={14} />
      </IconButton>
    </div>
  );
}
