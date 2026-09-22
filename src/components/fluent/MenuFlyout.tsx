"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ENTER, EXIT } from "@/lib/motion";

export interface MenuItem {
  etiqueta: string;
  onSelect: () => void;
  peligro?: boolean;
  deshabilitado?: boolean;
}

interface MenuFlyoutProps {
  abierto: boolean;
  /** Posición en pantalla (coordenadas de viewport): el puntero, o la esquina del botón que lo abrió. */
  x: number;
  y: number;
  items: MenuItem[];
  etiqueta: string;
  onCerrar: () => void;
}

/** Menú contextual Fluent (Acrylic): flechas, Inicio/Fin, Enter y Esc; devuelve el foco al cerrar. */
export function MenuFlyout({ abierto, x, y, items, etiqueta, onCerrar }: MenuFlyoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  const foco = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  // Ajusta la posición para que el menú no se salga de la ventana.
  useLayoutEffect(() => {
    if (!abierto) return;
    const r = ref.current?.getBoundingClientRect();
    const w = r?.width ?? 200;
    const h = r?.height ?? 160;
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - w - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    });
  }, [abierto, x, y, items.length]);

  useEffect(() => {
    if (abierto) {
      foco.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("[role=menuitem]:not([disabled])")?.focus());
    } else {
      foco.current?.focus?.();
      foco.current = null;
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onCerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCerrar();
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("blur", onCerrar);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla, true);
      window.removeEventListener("blur", onCerrar);
    };
  }, [abierto, onCerrar]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const botones = Array.from(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []);
    const i = botones.indexOf(document.activeElement as HTMLElement);
    const ir = (n: number) => {
      e.preventDefault();
      botones[(n + botones.length) % botones.length]?.focus();
    };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(botones.length - 1);
    else if (e.key === "Tab") {
      e.preventDefault();
      onCerrar();
    }
  };

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={ref}
          role="menu"
          aria-label={etiqueta}
          onKeyDown={onKeyDown}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0, transition: ENTER }}
          exit={{ opacity: 0, transition: EXIT }}
          style={{ left: pos.x, top: pos.y }}
          className="acrylic fixed z-50 min-w-[190px] rounded-control p-1 shadow-flyout"
        >
          {items.map((item) => (
            <button
              key={item.etiqueta}
              type="button"
              role="menuitem"
              disabled={item.deshabilitado}
              onClick={() => {
                onCerrar();
                item.onSelect();
              }}
              className={clsx(
                "rounded-control flex h-9 w-full items-center px-3 text-left text-body transition-colors duration-exit ease-fluent",
                "hover:bg-layer-alt focus-visible:bg-layer-alt disabled:opacity-40",
                item.peligro ? "text-danger-fg" : "text-fg",
              )}
            >
              {item.etiqueta}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
