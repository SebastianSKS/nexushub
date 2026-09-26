"use client";

import { useT } from "@/lib/i18n";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { NexusMark } from "@/components/shell/NexusMark";
import { ENTER, EXIT } from "@/lib/motion";
import { useNovedadesStore } from "@/store/novedades-store";

/** «Novedades»: lo que cambió desde la versión que tenías. Sale una sola vez después de actualizar. */
export function Novedades() {
  const t = useT();
  const abiertas = useNovedadesStore((s) => s.abiertas);
  const version = useNovedadesStore((s) => s.version);
  const cerrar = useNovedadesStore((s) => s.cerrar);

  useEffect(() => {
    if (!abiertas) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abiertas, cerrar]);

  return (
    <AnimatePresence>
      {abiertas && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("Novedades de Nexo {version}", { version: version ?? "" })}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: ENTER }}
          exit={{ opacity: 0, transition: EXIT }}
          className="fixed inset-0 z-[66] flex items-center justify-center p-6"
          style={{ backgroundColor: "var(--scrim)" }}
          onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: ENTER }}
            exit={{ opacity: 0, y: 6, transition: EXIT }}
            className="acrylic flex max-h-[min(640px,90vh)] w-full max-w-[480px] flex-col gap-4 rounded-[8px] p-6 shadow-dialog"
          >
            <div className="flex items-center justify-between">
              <NexusMark size={18} />
              <IconButton label={t("Cerrar las novedades")} onClick={cerrar} className="-mr-2">
                <Glifo nombre="cerrar" tam={12} />
              </IconButton>
            </div>
            <div>
              <h2 className="text-subtitle text-fg">{t("Novedades de Nexo {version}", { version: version ?? "" })}</h2>
              <p className="mt-1 text-body text-fg-secondary">{t("Esto es lo que cambió desde la última vez que lo abriste.")}</p>
            </div>
            <div className="-mr-2 flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
              {abiertas.map((v) => (
                <section key={v.version} aria-label={t("Versión {v}", { v: v.version })} className="flex flex-col gap-3">
                  {abiertas.length > 1 && <h3 className="text-caption font-semibold text-fg-tertiary">{t("Versión {v}", { v: v.version })}</h3>}
                  {v.novedades.map((n) => (
                    <div key={n.titulo} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd, #3fb6f5)" }} aria-hidden>
                        <Glifo nombre={n.glifo} tam={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-fg">{t(n.titulo)}</p>
                        <p className="text-caption text-fg-secondary">{t(n.texto)}</p>
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="accent" onClick={cerrar}>
                {t("Entendido")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
