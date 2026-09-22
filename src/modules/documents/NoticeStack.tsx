"use client";

import { AnimatePresence, motion } from "framer-motion";
import { InfoBar } from "@/components/fluent/InfoBar";
import { ENTER, EXIT } from "@/lib/motion";
import { useDocumentsStore } from "@/store/documents-store";

/**
 * Notificaciones tipo InfoBar del módulo. Flotan sobre el contenido (pegadas
 * arriba al desplazarse) para no mover el layout ni tapar el resultado.
 */
export function NoticeStack() {
  const notices = useDocumentsStore((s) => s.notices);
  const dismiss = useDocumentsStore((s) => s.dismissNotice);

  return (
    <div className="pointer-events-none sticky top-3 z-30 -mb-5 h-0" aria-label="Notificaciones">
      <div className="absolute right-0 top-0 flex w-[min(520px,100%)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {notices.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: ENTER }}
              exit={{ opacity: 0, transition: EXIT }}
              className="pointer-events-auto"
            >
              <InfoBar severity={n.severity} title={n.title} onClose={() => dismiss(n.id)} floating>
                {n.message}
              </InfoBar>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
