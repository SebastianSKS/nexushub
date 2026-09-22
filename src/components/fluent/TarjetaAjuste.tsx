"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { NombreGlifo } from "@/lib/glifos";
import { ENTER, EXIT } from "@/lib/motion";
import { Glifo } from "./Glifo";

interface CabeceraProps {
  glifo?: NombreGlifo;
  titulo: string;
  descripcion?: string;
}

function Cabecera({ glifo, titulo, descripcion }: CabeceraProps) {
  return (
    <>
      {glifo && <Glifo nombre={glifo} tam={20} className="text-fg-secondary" />}
      <span className="min-w-0 flex-1">
        <span className="block text-body text-fg">{titulo}</span>
        {descripcion && <span className="mt-0.5 block text-caption text-fg-secondary">{descripcion}</span>}
      </span>
    </>
  );
}

/** SettingsCard de WinUI: 68 px de alto mínimo, ícono, título con descripción y el control a la derecha. */
export function TarjetaAjuste({ glifo, titulo, descripcion, children, className }: CabeceraProps & { children?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex min-h-[68px] items-center gap-4 rounded-[4px] border border-stroke bg-layer px-4 py-3", className)}>
      <Cabecera glifo={glifo} titulo={titulo} descripcion={descripcion} />
      {children && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>}
    </div>
  );
}

/** SettingsExpander de WinUI: una tarjeta que se despliega y muestra más ajustes debajo. */
export function ExpansorAjuste({
  glifo,
  titulo,
  descripcion,
  children,
  filas,
  abiertoInicial = false,
  id,
}: CabeceraProps & { children?: ReactNode; filas: ReactNode; abiertoInicial?: boolean; id?: string }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const panel = useId();

  return (
    <div id={id} className="overflow-hidden rounded-[4px] border border-stroke bg-layer">
      <div className="flex min-h-[68px] items-center gap-4 px-4 py-3">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={panel}
          onClick={() => setAbierto((a) => !a)}
          className="rounded-control -my-1 -ml-2 flex min-w-0 flex-1 items-center gap-4 py-1 pl-2 text-left"
        >
          <Cabecera glifo={glifo} titulo={titulo} descripcion={descripcion} />
        </button>
        {children && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>}
        <button
          type="button"
          aria-label={abierto ? `Contraer ${titulo}` : `Expandir ${titulo}`}
          aria-expanded={abierto}
          aria-controls={panel}
          onClick={() => setAbierto((a) => !a)}
          className="rounded-control flex h-8 w-8 shrink-0 items-center justify-center text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer-alt"
        >
          <motion.span animate={{ rotate: abierto ? 180 : 0 }} transition={ENTER} className="flex">
            <Glifo nombre="chevronAbajo" tam={12} />
          </motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            id={panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: ENTER }}
            exit={{ height: 0, opacity: 0, transition: EXIT }}
            className="overflow-hidden"
          >
            <div className="flex flex-col divide-y divide-[var(--stroke)] border-t border-stroke bg-black/10">{filas}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Fila interior de un ExpansorAjuste (mismo formato que una tarjeta, sin borde). */
export function FilaAjuste({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[56px] items-center gap-4 py-2 pl-[52px] pr-4">
      <span className="min-w-0 flex-1">
        <span className="block text-body text-fg">{titulo}</span>
        {descripcion && <span className="mt-0.5 block text-caption text-fg-secondary">{descripcion}</span>}
      </span>
      {children && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>}
    </div>
  );
}
