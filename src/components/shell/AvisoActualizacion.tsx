"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { ProgressBar } from "@/components/fluent/ProgressBar";
import { ENTER, EXIT } from "@/lib/motion";
import { useActualizacionesStore } from "@/store/actualizaciones-store";

/**
 * «Hay una versión nueva»: una tarjeta abajo a la derecha, con «Actualizar ahora» y «Más tarde». Sale sola cuando Nexo, al
 * abrir, encuentra una versión más nueva. Descarga e instala con una barra de avance y, al terminar, ofrece reiniciar.
 * Si se pospone, no vuelve a salir hasta la próxima vez que se abra Nexo.
 */
export function AvisoActualizacion() {
  const { estado, version, progreso, pospuesta } = useActualizacionesStore();
  const instalar = useActualizacionesStore((s) => s.instalar);
  const reiniciar = useActualizacionesStore((s) => s.reiniciar);
  const posponer = useActualizacionesStore((s) => s.posponer);
  const visible = (estado === "disponible" && !pospuesta) || estado === "descargando" || estado === "lista";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: ENTER }}
          exit={{ opacity: 0, y: 8, transition: EXIT }}
          className="acrylic fixed bottom-24 right-4 z-[55] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-[8px] p-4 shadow-dialog"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd, #3fb6f5)" }} aria-hidden>
              <Glifo nombre="actualizar" tam={14} />
            </span>
            <div className="min-w-0">
              <p className="text-body font-semibold text-fg">{estado === "lista" ? "Actualización lista" : estado === "descargando" ? "Descargando la actualización…" : `Nexo ${version} está disponible`}</p>
              <p className="text-caption text-fg-secondary">
                {estado === "lista" ? "Reinicia Nexo para terminar. Tus datos se conservan." : estado === "descargando" ? "Puedes seguir usando Nexo mientras baja." : "Trae cosas nuevas y mejoras. Se instala en un momento y tus datos se conservan."}
              </p>
            </div>
          </div>
          {estado === "descargando" && <ProgressBar value={progreso ?? 8} label="Progreso de la descarga" />}
          {estado === "disponible" && (
            <div className="flex justify-end gap-2">
              <Button variant="subtle" onClick={posponer}>
                Más tarde
              </Button>
              <Button variant="accent" onClick={() => void instalar()}>
                Actualizar ahora
              </Button>
            </div>
          )}
          {estado === "lista" && (
            <div className="flex justify-end">
              <Button variant="accent" onClick={() => void reiniciar()}>
                Reiniciar ahora
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
