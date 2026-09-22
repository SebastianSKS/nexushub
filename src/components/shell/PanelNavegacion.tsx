"use client";

import { Suspense, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";
import { Tooltip } from "@/components/fluent/Tooltip";
import { ENTER, PILL_SPRING } from "@/lib/motion";
import { SECCIONES_INFERIORES, SECCIONES_PRINCIPALES, seccionDe, type Seccion } from "@/lib/rutas";
import { cumpleEn } from "@/lib/calendario/fechas";
import { useAppStore } from "@/store/app-store";
import { useCalendarioStore } from "@/store/calendario-store";
import { BotonPerfil } from "./BotonPerfil";
import { PlaylistsNav } from "./PlaylistsNav";

const EXPANDIDO = 280;
const COLAPSADO = 48;

/** Ítem de navegación: un <Link> real (clic con rueda, menú contextual) con la píldora de selección deslizante. */
function Item({ seccion, activa, colapsado, insignia = 0 }: { seccion: Seccion; activa: boolean; colapsado: boolean; insignia?: number }) {
  return (
    <Tooltip text={seccion.atajo ? `${seccion.etiqueta}  ·  Ctrl+${seccion.atajo}` : seccion.etiqueta} enabled={colapsado}>
      <Link
        href={seccion.ruta}
        data-nav-item
        aria-current={activa ? "page" : undefined}
        aria-label={seccion.etiqueta}
        className={clsx(
          "rounded-control reveal relative flex h-10 w-full items-center gap-4 pl-[15px] pr-3 text-body transition-colors duration-exit ease-fluent",
          activa ? "bg-layer-alt text-fg" : "text-fg-secondary hover:bg-layer hover:text-fg active:bg-layer-alt",
        )}
      >
        {activa && (
          <motion.span
            layoutId="nav-pill"
            transition={PILL_SPRING}
            aria-hidden
            className="absolute left-0 h-4 w-[3px] rounded-full bg-accent"
            style={{ top: 12 }}
          />
        )}
        <Glifo nombre={seccion.glifo} tam={16} className={activa ? "text-accent-text" : undefined} />
        <span className={clsx("truncate transition-opacity duration-exit ease-fluent", colapsado ? "opacity-0" : "opacity-100", activa && "font-semibold")} aria-hidden>
          {seccion.etiqueta}
        </span>
        {insignia > 0 && (
          <span
            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-caption font-semibold text-accent-on"
            style={colapsado ? { position: "absolute", right: 4, top: 4, height: 16, minWidth: 16, fontSize: 10, padding: "0 3px" } : undefined}
            aria-label={insignia === 1 ? "1 cumpleaños hoy" : `${insignia} cumpleaños hoy`}
          >
            {insignia}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}

/**
 * NavigationView de WinUI: 280 px expandido, 48 px colapsado (y se colapsa solo por debajo de 1000 px
 * de ancho de ventana). La sección activa sale de la URL. La píldora de selección SIEMPRE se desliza
 * entre ítems: es el mismo elemento (layoutId), nunca aparece y desaparece.
 */
export function PanelNavegacion() {
  const pathname = usePathname();
  const activa = seccionDe(pathname);
  const colapsado = useAppStore((s) => s.sidebarCollapsed);
  const alternar = useAppStore((s) => s.toggleSidebar);
  const ref = useRef<HTMLElement>(null);
  const cumplesHoy = useCalendarioStore((s) => s.amigos.filter((a) => cumpleEn(a, new Date())).length);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-nav-item]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    const ir = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(items.length - 1);
  };

  return (
    <motion.nav
      ref={ref}
      aria-label="Navegación principal"
      initial={false}
      animate={{ width: colapsado ? COLAPSADO : EXPANDIDO }}
      transition={ENTER}
      onKeyDown={onKeyDown}
      className="flex shrink-0 flex-col overflow-hidden px-1 pb-2 pt-1"
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!colapsado}
        aria-label={colapsado ? "Expandir barra lateral" : "Contraer barra lateral"}
        title={colapsado ? "Expandir" : "Contraer"}
        className="rounded-control mb-1 flex h-10 w-10 shrink-0 items-center justify-center text-fg transition-colors duration-exit ease-fluent hover:bg-layer"
      >
        <Glifo nombre="menu" tam={16} />
      </button>

      <ul className="flex flex-col gap-0.5">
        {SECCIONES_PRINCIPALES.map((s) => (
          <li key={s.id}>
            <Item seccion={s} activa={activa === s.id} colapsado={colapsado} insignia={s.id === "calendario" ? cumplesHoy : 0} />
          </li>
        ))}
      </ul>

      <Suspense fallback={null}>
        <PlaylistsNav />
      </Suspense>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-stroke pt-2">
        <BotonPerfil colapsado={colapsado} />
        {SECCIONES_INFERIORES.map((s) => (
          <Item key={s.id} seccion={s} activa={activa === s.id} colapsado={colapsado} />
        ))}
      </div>
    </motion.nav>
  );
}
