"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { rutaLista, seccionDe } from "@/lib/rutas";

import { useMusicStore } from "@/store/music-store";
import { useAppStore } from "@/store/app-store";

/** Playlists del usuario conectado con Spotify, dentro de la barra lateral (solo en Música). */
export function PlaylistsNav() {
  const activo = seccionDe(usePathname()) === "musica";
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const connection = useMusicStore((s) => s.connection);
  const playlists = useMusicStore((s) => s.playlists);
  const idActual = useSearchParams().get("id");

  if (!activo || collapsed || connection.status !== "connected" || playlists.length === 0) return null;

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-stroke pt-3" aria-label="Tus playlists de Spotify" role="group">
      <p className="mb-1 px-3 text-caption font-semibold text-fg-tertiary">Tus playlists</p>
      <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
        {playlists.map((p) => (
          <li key={p.id}>
            <Link
              href={rutaLista(p.id, "playlist")}
              aria-current={idActual === p.id ? "page" : undefined}
              className={
                "rounded-control flex h-9 w-full items-center gap-3 px-3 text-left text-body transition-colors duration-exit ease-fluent hover:bg-layer " +
                (idActual === p.id ? "bg-layer-alt text-fg" : "text-fg-secondary hover:text-fg")
              }
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- carátula remota de Spotify
                <img src={p.image} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-[4px] object-cover" />
              ) : (
                <span className="h-6 w-6 shrink-0 rounded-[4px] bg-layer-alt" aria-hidden />
              )}
              <span className="truncate">{p.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
