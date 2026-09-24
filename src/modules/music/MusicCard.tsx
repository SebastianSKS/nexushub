"use client";

import Link from "next/link";
import clsx from "clsx";
import { MoreHorizontal20Regular, Play24Filled } from "@fluentui/react-icons";
import { IconButton } from "@/components/fluent/IconButton";
import { pistaDeItem } from "@/services/music/lista";
import { abrirMenuPista } from "@/store/menu-pista-store";
import { rutaLista } from "@/lib/rutas";
import type { MusicItem } from "@/types/music";

interface MusicCardProps {
  item: MusicItem;
  active: boolean;
  /** Las canciones se reproducen al instante; álbumes, playlists y artistas abren su lista (/musica/lista). */
  onPlay: () => void;
}

const clases = (active: boolean) =>
  clsx(
    "rounded-control reveal group relative block border bg-layer p-3 text-left shadow-card",
    "transition-colors duration-exit ease-fluent hover:bg-layer-alt",
    active ? "border-accent" : "border-stroke",
  );

function Interior({ item, active }: { item: MusicItem; active: boolean }) {
  return (
    <>
      <span className="relative block aspect-square w-full overflow-hidden rounded-input bg-layer-alt shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- carátula remota de Spotify */}
        <img
          src={item.cover}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-enter ease-fluent group-hover:scale-[1.03]"
        />
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
        <span className="block truncate text-body font-semibold text-fg" title={item.title}>
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-caption text-fg-secondary" title={item.subtitle}>
          {item.subtitle}
        </span>
      </span>
    </>
  );
}

/** Tarjeta de música: carátula cuadrada, título y artista. */
export function MusicCard({ item, active, onPlay }: MusicCardProps) {
  if (item.kind === "track") {
    const pista = pistaDeItem(item);
    const ids = { artistId: item.artistId, albumId: item.albumId };
    return (
      <div className="group relative" onContextMenu={(e) => abrirMenuPista(e, pista, ids)}>
        <button type="button" onClick={onPlay} aria-label={`Reproducir ${item.title}, ${item.subtitle}`} aria-current={active ? "true" : undefined} className={clsx(clases(active), "w-full")}>
          <Interior item={item} active={active} />
        </button>
        <IconButton
          label={`Más opciones de ${item.title}`}
          onClick={(e) => abrirMenuPista(e, pista, ids)}
          className="absolute right-4 top-4 bg-layer/80 opacity-0 backdrop-blur-sm focus-visible:opacity-100 group-hover:opacity-100"
        >
          <MoreHorizontal20Regular />
        </IconButton>
      </div>
    );
  }
  return (
    <Link href={rutaLista(item.id, item.kind)} aria-label={`Abrir ${item.title}, ${item.subtitle}`} className={clases(active)}>
      <Interior item={item} active={active} />
    </Link>
  );
}
