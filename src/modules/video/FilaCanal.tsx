"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { MoreHorizontal20Regular } from "@fluentui/react-icons";
import { IconButton } from "@/components/fluent/IconButton";
import { MenuFlyout, type MenuItem } from "@/components/fluent/MenuFlyout";
import { useCanalesStore } from "@/store/canales-store";
import { rutaCanal } from "@/lib/rutas";
import type { Canal } from "@/types/canal";
import { AvatarCanal } from "./AvatarCanal";

interface FilaCanalProps {
  canal: Canal;
  indice: number;
  total: number;
}

/** Una fila de la barra de canales: avatar, nombre, cantidad de videos y menú (clic derecho o «⋯»). */
export function FilaCanal({ canal, indice, total }: FilaCanalProps) {
  const feed = useCanalesStore((s) => s.feeds[canal.id]);
  const enCanal = usePathname().replace(/\/$/, "") === "/video/canal";
  const idActual = useSearchParams().get("id");
  const seleccionado = enCanal && idActual === canal.id;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const cantidad = feed?.videos.length ?? 0;
  const detalle =
    feed?.estado === "cargando" && cantidad === 0
      ? "Cargando…"
      : feed?.estado === "error"
        ? "No se pudo actualizar"
        : `${cantidad} ${cantidad === 1 ? "video" : "videos"}`;

  const acciones = useCanalesStore.getState();
  const items: MenuItem[] = [
    { etiqueta: "Actualizar", onSelect: () => void acciones.cargarFeed(canal.id, { fresco: true }) },
    ...(canal.sugerido ? [{ etiqueta: "Conservar (quitar «Sugerido»)", onSelect: () => acciones.conservarSugerido(canal.id) }] : []),
    { etiqueta: "Subir", onSelect: () => acciones.moverCanal(canal.id, -1), deshabilitado: indice === 0 },
    { etiqueta: "Bajar", onSelect: () => acciones.moverCanal(canal.id, 1), deshabilitado: indice === total - 1 },
    { etiqueta: "Quitar", onSelect: () => acciones.quitarCanal(canal.id), peligro: true },
  ];

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      className={clsx(
        "rounded-control reveal group relative flex items-center gap-2 pr-1 transition-colors duration-exit ease-fluent",
        seleccionado ? "bg-layer-alt" : "hover:bg-layer",
      )}
    >
      <Link
        href={rutaCanal(canal.id)}
        aria-current={seleccionado ? "page" : undefined}
        aria-label={`${canal.nombre}, ${detalle}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-control py-2 pl-2 text-left"
      >
        <AvatarCanal nombre={canal.nombre} avatar={canal.avatar} tam={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body text-fg" title={canal.nombre}>
            {canal.nombre}
          </span>
          <span className="flex items-center gap-1.5 text-caption text-fg-secondary">
            <span className="tabular truncate">{detalle}</span>
            {canal.sugerido && (
              <span
                className="shrink-0 rounded-full px-1.5 text-caption text-fg"
                style={{ backgroundColor: "color-mix(in srgb, var(--accent) 24%, transparent)" }}
              >
                Sugerido
              </span>
            )}
          </span>
        </span>
      </Link>
      <IconButton
        label={`Opciones de ${canal.nombre}`}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        className="h-7 w-7 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: r.left, y: r.bottom + 4 });
        }}
      >
        <MoreHorizontal20Regular />
      </IconButton>
      <MenuFlyout abierto={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} items={items} etiqueta={`Opciones de ${canal.nombre}`} onCerrar={() => setMenu(null)} />
    </div>
  );
}
