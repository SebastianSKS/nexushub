"use client";

import { useEffect, useState } from "react";
import { Timer20Regular } from "@fluentui/react-icons";
import clsx from "clsx";
import { MenuFlyout, type MenuItem } from "@/components/fluent/MenuFlyout";
import { avisoBreve } from "@/services/music/megusta";
import { useReproductorStore } from "@/store/reproductor-store";

/** Lo que falta para que el temporizador pause la música, en texto corto («23 min»). */
function restante(hasta: number): string {
  const s = Math.max(0, Math.round((hasta - Date.now()) / 1000));
  return s >= 90 ? `${Math.ceil(s / 60)} min` : `${s} s`;
}

/** Botón de la barra de música: «Temporizador para dormir» con sus opciones. */
export function TemporizadorDormir({ className }: { className?: string }) {
  const dormir = useReproductorStore((s) => s.dormir);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [, refrescar] = useState(0);

  // Mientras hay un temporizador por tiempo, se refresca el «faltan…» cada 10 s.
  useEffect(() => {
    if (dormir?.modo !== "tiempo") return;
    const id = setInterval(() => refrescar((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [dormir]);

  const poner = (minutos: number) => {
    useReproductorStore.getState().programarDormir({ modo: "tiempo", hasta: Date.now() + minutos * 60_000 });
    avisoBreve("Temporizador activado", `La música se detendrá en ${minutos} minutos.`);
  };

  const items: MenuItem[] = [
    { etiqueta: "En 5 minutos", onSelect: () => poner(5) },
    { etiqueta: "En 15 minutos", onSelect: () => poner(15) },
    { etiqueta: "En 30 minutos", onSelect: () => poner(30) },
    { etiqueta: "En 45 minutos", onSelect: () => poner(45) },
    { etiqueta: "En 1 hora", onSelect: () => poner(60) },
    {
      etiqueta: "Al terminar esta canción",
      onSelect: () => {
        useReproductorStore.getState().programarDormir({ modo: "cancion" });
        avisoBreve("Temporizador activado", "La música se detendrá al terminar esta canción.");
      },
    },
    ...(dormir ? [{ etiqueta: "Desactivar el temporizador", onSelect: () => useReproductorStore.getState().programarDormir(null) }] : []),
  ];

  const etiqueta = dormir ? (dormir.modo === "tiempo" ? `Temporizador: faltan ${restante(dormir.hasta)}` : "Temporizador: al terminar la canción") : "Temporizador para dormir";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: r.left, y: r.top - 8 - items.length * 36 - 8 });
        }}
        aria-label={etiqueta}
        title={etiqueta}
        aria-pressed={dormir !== null}
        className={clsx("rounded-control flex h-8 shrink-0 items-center justify-center gap-1 px-1.5 text-caption transition-[background-color,color] duration-exit ease-fluent hover:bg-layer-alt", dormir ? "text-accent-text" : "text-fg", className)}
      >
        <Timer20Regular />
        {dormir?.modo === "tiempo" && <span className="tabular">{restante(dormir.hasta)}</span>}
      </button>
      <MenuFlyout abierto={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} items={items} etiqueta="Temporizador para dormir" onCerrar={() => setMenu(null)} />
    </>
  );
}
