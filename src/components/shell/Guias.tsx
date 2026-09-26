"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { NexusMark } from "@/components/shell/NexusMark";
import { GUIAS, type Guia } from "@/lib/guias";
import { ENTER, EXIT } from "@/lib/motion";
import { useGuiasStore } from "@/store/guias-store";

/** El cuadro de una guía: pasos cortos con «Siguiente», «Atrás» y «Omitir». Sirve igual para la bienvenida y para cada sección. */
function CuadroGuia({ guia, onCerrar }: { guia: Guia; onCerrar: () => void }) {
  const t = useT();
  const [paso, setPaso] = useState(0);
  const ultimo = paso === guia.pasos.length - 1;
  const p = guia.pasos[paso]!;

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowRight") setPaso((x) => Math.min(guia.pasos.length - 1, x + 1));
      else if (e.key === "ArrowLeft") setPaso((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [guia, onCerrar]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={guia.id === "bienvenida" ? t("Bienvenida a Nexo") : t("Guía: {nombre}", { nombre: t(guia.nombre) })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTER }}
      exit={{ opacity: 0, transition: EXIT }}
      className="fixed inset-0 z-[65] flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--scrim)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: ENTER }}
        exit={{ opacity: 0, y: 6, transition: EXIT }}
        className="acrylic flex w-full max-w-[440px] flex-col items-center gap-5 rounded-[8px] p-7 text-center shadow-dialog"
      >
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2">
            <NexusMark size={18} />
            {guia.id !== "bienvenida" && <span className="text-caption text-fg-secondary">{t("Guía")} · {t(guia.nombre)}</span>}
          </span>
          <IconButton label={guia.id === "bienvenida" ? t("Omitir la bienvenida") : t("Cerrar la guía")} onClick={onCerrar} className="-mr-2">
            <Glifo nombre="cerrar" tam={12} />
          </IconButton>
        </div>

        <span className="flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd, #3fb6f5)" }} aria-hidden>
          <Glifo nombre={p.glifo} tam={28} />
        </span>

        <div>
          <h2 className="text-subtitle text-fg">{t(p.titulo)}</h2>
          <p className="mt-2 text-body text-fg-secondary">{t(p.texto)}</p>
        </div>

        {guia.pasos.length > 1 && (
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Paso">
            {guia.pasos.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === paso}
                aria-label={t("Paso {i} de {n}", { i: i + 1, n: guia.pasos.length })}
                onClick={() => setPaso(i)}
                className={clsx("h-1.5 rounded-full transition-[width,background-color] duration-exit ease-fluent", i === paso ? "w-5 bg-accent" : "w-1.5 bg-stroke-strong hover:bg-fg-tertiary")}
              />
            ))}
          </div>
        )}

        <div className="flex w-full items-center justify-between gap-2">
          {guia.pasos.length > 1 && !ultimo ? (
            <Button variant="subtle" onClick={onCerrar}>
              {t("Omitir")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {paso > 0 && <Button onClick={() => setPaso((x) => x - 1)}>{t("Atrás")}</Button>}
            <Button variant="accent" onClick={() => (ultimo ? onCerrar() : setPaso((x) => x + 1))}>
              {ultimo ? t(guia.final) : t("Siguiente")}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** La guía que esté a la vista (la bienvenida o la de una sección). Se monta una sola vez, en el armazón de la ventana. */
export function Guias() {
  const abierta = useGuiasStore((s) => s.abierta);
  const cerrar = useGuiasStore((s) => s.cerrar);
  return <AnimatePresence>{abierta && <CuadroGuia key={abierta} guia={GUIAS[abierta]} onCerrar={cerrar} />}</AnimatePresence>;
}
