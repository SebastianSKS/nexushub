"use client";

import { useT } from "@/lib/i18n";
import { ArrowReset20Regular, ArrowDown20Regular, ArrowUp20Regular, Delete20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { useDocumentsStore } from "@/store/documents-store";

/** Mueve las páginas elegidas un lugar hacia el principio (-1) o el final (+1), respetando su orden relativo. */
export function moverSeleccion(orden: readonly number[], elegidas: ReadonlySet<number>, paso: -1 | 1): number[] {
  const r = [...orden];
  const indices = r.map((p, i) => (elegidas.has(p) ? i : -1)).filter((i) => i >= 0);
  if (paso === 1) indices.reverse();
  for (const i of indices) {
    const j = i + paso;
    if (j < 0 || j >= r.length || elegidas.has(r[j]!)) continue; // ya está pegada al borde o a otra elegida
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

export function OrganizeOptionsPanel() {
  const t = useT();
  const order = useDocumentsStore((s) => s.options.organize.order);
  const selected = useDocumentsStore((s) => s.selectedPages);
  const pageCount = useDocumentsStore((s) => s.pageCount);
  const setOption = useDocumentsStore((s) => s.setOption);
  const setSelectedPages = useDocumentsStore((s) => s.setSelectedPages);

  const hay = selected.length > 0;
  const elegidas = new Set(selected);
  const poner = (next: number[]) => setOption("organize", { order: next });
  const quitar = () => {
    const resto = order.filter((p) => !elegidas.has(p));
    poner(resto);
    setSelectedPages([]);
  };
  const alBorde = (inicio: boolean) => {
    const a = order.filter((p) => elegidas.has(p));
    const b = order.filter((p) => !elegidas.has(p));
    poner(inicio ? [...a, ...b] : [...b, ...a]);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-fg-secondary">{hay ? (selected.length === 1 ? t("Página seleccionada.") : t("{n} páginas seleccionadas.", { n: selected.length })) : t("Elige páginas en las miniaturas para moverlas o quitarlas.")}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => poner(moverSeleccion(order, elegidas, -1))} disabled={!hay} icon={<ArrowUp20Regular />}>
          {t("Antes")}
        </Button>
        <Button onClick={() => poner(moverSeleccion(order, elegidas, 1))} disabled={!hay} icon={<ArrowDown20Regular />}>
          {t("Después")}
        </Button>
        <Button onClick={() => alBorde(true)} disabled={!hay}>
          {t("Al principio")}
        </Button>
        <Button onClick={() => alBorde(false)} disabled={!hay}>
          {t("Al final")}
        </Button>
      </div>
      <Button onClick={quitar} disabled={!hay || order.length - selected.filter((p) => order.includes(p)).length < 1} icon={<Delete20Regular />}>
        {t("Eliminar seleccionadas")}
      </Button>
      <Button
        variant="subtle"
        onClick={() => {
          if (pageCount) poner(Array.from({ length: pageCount }, (_, i) => i + 1));
          setSelectedPages([]);
        }}
        disabled={!pageCount}
        icon={<ArrowReset20Regular />}
      >
        {t("Restablecer")}
      </Button>
      <p className="text-caption text-fg-tertiary">{t("Tu archivo original no cambia: se guarda una copia con el nuevo orden.")}</p>
    </div>
  );
}
