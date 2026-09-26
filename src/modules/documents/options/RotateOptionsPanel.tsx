"use client";

import { useT } from "@/lib/i18n";
import {
  ArrowReset20Regular,
  ArrowRotateClockwise20Regular,
  ArrowRotateCounterclockwise20Regular,
} from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { useDocumentsStore } from "@/store/documents-store";
import type { RotateOptions } from "@/types/documents";

/** Suma `delta` grados (múltiplo de 90) al giro de una página; 0 elimina la entrada. */
function addRotation(current: RotateOptions["rotations"], page: number, delta: number): RotateOptions["rotations"] {
  const next = { ...current };
  const total = (((next[page] ?? 0) + delta) % 360 + 360) % 360;
  if (total === 0) delete next[page];
  else next[page] = total as 90 | 180 | 270;
  return next;
}

export function RotateOptionsPanel() {
  const t = useT();
  const rotations = useDocumentsStore((s) => s.options.rotate.rotations);
  const selected = useDocumentsStore((s) => s.selectedPages);
  const pageCount = useDocumentsStore((s) => s.pageCount);
  const setOption = useDocumentsStore((s) => s.setOption);

  const targets = selected.length > 0 ? selected : pageCount ? Array.from({ length: pageCount }, (_, i) => i + 1) : [];
  const rotatedCount = Object.keys(rotations).length;

  const rotate = (delta: number) => {
    let next = rotations;
    for (const p of targets) next = addRotation(next, p, delta);
    setOption("rotate", { rotations: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-fg-secondary">
        {selected.length > 0
          ? selected.length === 1
            ? t("Se girará la página seleccionada.")
            : t("Se girarán las {n} páginas seleccionadas.", { n: selected.length })
          : t("Sin selección: el giro se aplica a todas las páginas. Elige algunas en las miniaturas para girar solo esas.")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => rotate(270)} disabled={targets.length === 0} icon={<ArrowRotateCounterclockwise20Regular />}>
          {t("Izquierda")}
        </Button>
        <Button onClick={() => rotate(90)} disabled={targets.length === 0} icon={<ArrowRotateClockwise20Regular />}>
          {t("Derecha")}
        </Button>
      </div>
      <Button onClick={() => rotate(180)} disabled={targets.length === 0}>
        Girar 180°
      </Button>
      <Button
        variant="subtle"
        onClick={() => setOption("rotate", { rotations: {} })}
        disabled={rotatedCount === 0}
        icon={<ArrowReset20Regular />}
      >
        {t("Restablecer giros")}
      </Button>
      <p className="text-caption text-fg-tertiary">
        {rotatedCount === 0
          ? t("Aún no has girado ninguna página.")
          : rotatedCount === 1
            ? t("1 página girada; verás el resultado en las miniaturas.")
            : t("{n} páginas giradas; verás el resultado en las miniaturas.", { n: rotatedCount })}
      </p>
    </div>
  );
}
