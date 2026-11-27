"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";

const Resaltado = createContext<string | null>(null);

/** Cuánto dura marcado el ajuste al que se llegó desde el buscador. */
const DURACION_MS = 2600;

/** Lleva a la vista el ajuste pedido en la dirección (`?ajuste=`) y lo deja marcado un momento. */
export function AjusteResaltado({ categoria, ajuste, children }: { categoria: string; ajuste: string | null; children: ReactNode }) {
  const [marcado, setMarcado] = useState<string | null>(null);

  useEffect(() => {
    setMarcado(ajuste);
    if (!ajuste) return;
    // En el siguiente cuadro, cuando la categoría ya está dibujada.
    const cuadro = requestAnimationFrame(() => document.querySelector(`[data-ajuste="${CSS.escape(ajuste)}"]`)?.scrollIntoView({ block: "center" }));
    const reloj = window.setTimeout(() => setMarcado(null), DURACION_MS);
    return () => {
      cancelAnimationFrame(cuadro);
      window.clearTimeout(reloj);
    };
  }, [categoria, ajuste]);

  return <Resaltado.Provider value={marcado}>{children}</Resaltado.Provider>;
}

/** Marca dónde está un ajuste (el `id` es el de `AJUSTES` en ajustes-categorias). Si no tiene nada dentro, no ocupa lugar. */
export function Ancla({ id, children }: { id: string; children?: ReactNode }) {
  const marcado = useContext(Resaltado) === id;
  return (
    <div data-ajuste={id} className={clsx("rounded-[4px] outline outline-2 outline-offset-1 transition-[outline-color] duration-300 empty:hidden", marcado ? "outline-[var(--accent)]" : "outline-transparent")}>
      {children}
    </div>
  );
}
