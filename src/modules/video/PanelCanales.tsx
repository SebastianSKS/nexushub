"use client";

import { useT } from "@/lib/i18n";
import Link from "next/link";
import { Reorder } from "framer-motion";
import { useCanalesStore } from "@/store/canales-store";
import { FilaCanal } from "./FilaCanal";

/** Barra lateral secundaria (240 px) con los canales suscritos, reordenables arrastrando. */
export function PanelCanales() {
  const t = useT();
  const canales = useCanalesStore((s) => s.canales);
  return (
    <section aria-label={t("Tus canales")} className="flex min-h-0 w-full flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-body font-semibold text-fg">{t("Tus canales")}</h2>
        <span className="tabular text-caption text-fg-secondary">{canales.length}</span>
      </div>

      <Reorder.Group
        axis="y"
        values={canales}
        onReorder={useCanalesStore.getState().reordenarCanales}
        aria-label={t("Canales suscritos, arrastra para reordenar")}
        className="flex max-h-[min(50vh,420px)] min-h-0 flex-col gap-0.5 overflow-y-auto pr-1"
      >
        {canales.map((c, i) => (
          <Reorder.Item key={c.id} value={c} className="list-none" whileDrag={{ scale: 1.02, zIndex: 10 }}>
            <FilaCanal canal={c} indice={i} total={canales.length} />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <Link href="/configuracion#canales" className="rounded-control px-1 text-caption text-accent-text hover:underline">
        {t("Importar, exportar o restaurar canales")}
      </Link>
    </section>
  );
}
