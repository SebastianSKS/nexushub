"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ENTER, EXIT } from "@/lib/motion";
import { Glifo } from "./Glifo";

export interface OpcionSelector<T extends string | number> {
  value: T;
  label: string;
}

interface SelectorProps<T extends string | number> {
  id?: string;
  /** Nombre del campo; se combina con el valor elegido para el nombre accesible del botón ("Mes: Septiembre"). */
  label: string;
  value: T;
  options: readonly OpcionSelector<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * ComboBox propio (botón + lista emergente), en vez de un <select> nativo: en la ventana de escritorio
 * (transparente, sin marco propio de Windows) el desplegable nativo del sistema se dibuja mal — a veces
 * en blanco y sin el tema oscuro. Mismo teclado que un <select>: flechas, Inicio/Fin, Escape, tipeo.
 * El nombre accesible siempre lo pone `aria-label` (con el valor incluido): así no depende de que la
 * etiqueta externa use `htmlFor` correctamente, y un lector de pantalla siempre anuncia el valor elegido.
 */
export function Selector<T extends string | number>({ id, label, value, options, onChange, className }: SelectorProps<T>) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, ancho: 0, alto: 0, arriba: false });
  const [montado, setMontado] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const actual = options.find((o) => o.value === value);

  // La lista se saca por portal a <body>: dentro de un diálogo animado (Framer Motion le pone
  // `transform`), un `position: fixed` normal se posiciona relativo a ESE ancestro, no a la ventana,
  // y el menú aparece descolocado. document solo existe en el cliente, de ahí este montado en efecto.
  useEffect(() => setMontado(true), []);

  const abrir = () => {
    const r = disparador.current?.getBoundingClientRect();
    if (!r) return;
    const alto = Math.min(options.length * 32 + 8, 280);
    const arriba = r.bottom + alto > window.innerHeight - 8 && r.top > alto;
    setPos({ x: r.left, y: arriba ? r.top - alto : r.bottom, ancho: r.width, alto, arriba });
    setAbierto(true);
  };

  // Al abrir, deja el foco en la opción elegida (o la primera) y la centra en la lista.
  useLayoutEffect(() => {
    if (!abierto) return;
    const el = lista.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? lista.current?.querySelector<HTMLElement>("[role=option]");
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!lista.current?.contains(e.target as Node) && !disparador.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAbierto(false);
        disparador.current?.focus();
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("blur", () => setAbierto(false));
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierto]);

  const onKeyDownLista = (e: React.KeyboardEvent) => {
    const botones = Array.from(lista.current?.querySelectorAll<HTMLElement>("[role=option]") ?? []);
    const i = botones.indexOf(document.activeElement as HTMLElement);
    const ir = (n: number) => {
      e.preventDefault();
      botones[(n + botones.length) % botones.length]?.focus();
    };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(botones.length - 1);
    else if (e.key === "Tab") setAbierto(false);
  };

  return (
    <>
      <button
        ref={disparador}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={`${label}: ${actual?.label ?? ""}`}
        title={`${label}: ${actual?.label ?? ""}`}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        className={clsx(
          "flex h-8 w-full items-center justify-between gap-2 rounded-input border border-stroke bg-layer-alt px-2 text-body text-fg",
          "transition-colors duration-exit ease-fluent hover:bg-layer focus-visible:border-accent focus-visible:outline-none",
          className,
        )}
      >
        <span className="truncate">{actual?.label ?? ""}</span>
        <Glifo nombre="chevronAbajo" tam={10} className="shrink-0 text-fg-secondary" />
      </button>

      {montado &&
        createPortal(
          <AnimatePresence>
            {abierto && (
              <motion.div
                ref={lista}
                role="listbox"
                aria-label={label}
                onKeyDown={onKeyDownLista}
                initial={{ opacity: 0, y: pos.arriba ? 4 : -4 }}
                animate={{ opacity: 1, y: 0, transition: ENTER }}
                exit={{ opacity: 0, transition: EXIT }}
                style={{ left: pos.x, top: pos.y, width: pos.ancho, maxHeight: pos.alto }}
                className="acrylic fixed z-[70] overflow-y-auto rounded-control p-1 shadow-flyout"
              >
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onClick={() => {
                      onChange(o.value);
                      setAbierto(false);
                      disparador.current?.focus();
                    }}
                    className={clsx(
                      "rounded-control flex h-8 w-full items-center px-3 text-left text-body transition-colors duration-exit ease-fluent",
                      "hover:bg-layer-alt focus-visible:bg-layer-alt",
                      o.value === value ? "font-semibold text-accent-text" : "text-fg",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
