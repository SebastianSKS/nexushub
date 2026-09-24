"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { ENTER, EXIT } from "@/lib/motion";
import { useCalendarioStore } from "@/store/calendario-store";

/** Avisos de cumpleaños dentro de la aplicación, arriba a la derecha. Se cierran con la «x». */
export function AvisosCumple() {
  const pendientes = useCalendarioStore((s) => s.pendientes);
  const cerrar = useCalendarioStore((s) => s.cerrarAviso);

  return (
    <div className="pointer-events-none fixed right-4 top-11 z-40 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {pendientes.map((a) => (
          <motion.div
            key={a.id}
            layout
            role="status"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0, transition: ENTER }}
            exit={{ opacity: 0, x: 24, transition: EXIT }}
            className="acrylic pointer-events-auto flex items-start gap-3 rounded-[8px] p-3 shadow-flyout"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd, #3fb6f5)" }} aria-hidden>
              <Glifo nombre={a.destino?.glifo ?? "calendario"} tam={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-fg">{a.titulo}</p>
              <p className="text-caption text-fg-secondary">{a.texto}</p>
              <Link href={a.destino?.ruta ?? "/calendario"} onClick={() => cerrar(a.id)} className="mt-1 inline-block text-caption font-semibold text-accent-text hover:underline">
                {a.destino?.etiqueta ?? "Abrir el calendario"}
              </Link>
            </div>
            <IconButton label="Cerrar aviso" onClick={() => cerrar(a.id)} className="h-7 w-7">
              <Glifo nombre="cerrar" tam={10} />
            </IconButton>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
