"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Switch } from "@/components/fluent/Switch";
import { TextInput } from "@/components/fluent/TextInput";
import { useDocumentsStore } from "@/store/documents-store";
import type { NumberPosition } from "@/types/documents";

export function PageNumbersOptionsPanel() {
  const o = useDocumentsStore((s) => s.options.pageNumbers);
  const setOption = useDocumentsStore((s) => s.setOption);
  const cambiar = (parcial: Partial<typeof o>) => setOption("pageNumbers", { ...useDocumentsStore.getState().options.pageNumbers, ...parcial });
  const [vertical, horizontal] = o.position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
  const poner = (v: string, h: string) => cambiar({ position: `${v}-${h}` as NumberPosition });
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label="Lugar"
        value={vertical}
        options={[
          { value: "bottom", label: "Abajo" },
          { value: "top", label: "Arriba" },
        ]}
        onChange={(v) => poner(v, horizontal)}
      />
      <SegmentedControl
        label="Alineación"
        etiquetaVisible={false}
        value={horizontal}
        options={[
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
          { value: "right", label: "Derecha" },
        ]}
        onChange={(h) => poner(vertical, h)}
      />
      <SegmentedControl
        label="Formato"
        value={o.format}
        options={[
          { value: "n", label: "3" },
          { value: "of-total", label: "3 de 12" },
          { value: "page", label: "Página 3" },
        ]}
        onChange={(format) => cambiar({ format })}
      />
      <TextInput
        label="Empezar a contar desde"
        type="number"
        inputMode="numeric"
        min={0}
        max={99999}
        value={String(o.start)}
        onChange={(e) => cambiar({ start: e.target.value === "" ? 1 : Number(e.target.value) })}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-body text-fg-secondary">No numerar la primera página (portada)</span>
        <Switch label="No numerar la primera página" checked={o.skipFirst} onChange={(skipFirst) => cambiar({ skipFirst })} />
      </div>
    </div>
  );
}
