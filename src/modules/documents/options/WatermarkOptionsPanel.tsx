"use client";

import { useT } from "@/lib/i18n";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Slider } from "@/components/fluent/Slider";
import { TextInput } from "@/components/fluent/TextInput";
import { useDocumentsStore } from "@/store/documents-store";

export function WatermarkOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.watermark);
  const setOption = useDocumentsStore((s) => s.setOption);
  const cambiar = (parcial: Partial<typeof o>) => setOption("watermark", { ...useDocumentsStore.getState().options.watermark, ...parcial });
  return (
    <div className="flex flex-col gap-3">
      <TextInput label={t("Texto")} value={o.text} maxLength={40} placeholder={t("CONFIDENCIAL")} onChange={(e) => cambiar({ text: e.target.value })} />
      <SegmentedControl
        label={t("Posición")}
        value={o.layout}
        options={[
          { value: "diagonal", label: t("En diagonal") },
          { value: "horizontal", label: t("Horizontal") },
        ]}
        onChange={(layout) => cambiar({ layout })}
      />
      <SegmentedControl
        label={t("Tamaño")}
        value={o.size}
        options={[
          { value: "small", label: t("Pequeño") },
          { value: "medium", label: t("Medio") },
          { value: "large", label: t("Grande") },
        ]}
        onChange={(size) => cambiar({ size })}
      />
      <SegmentedControl
        label={t("Color")}
        value={o.color}
        options={[
          { value: "gray", label: t("Gris") },
          { value: "red", label: t("Rojo") },
          { value: "blue", label: t("Azul") },
          { value: "black", label: t("Negro") },
        ]}
        onChange={(color) => cambiar({ color })}
      />
      <div>
        <div className="mb-1.5 flex justify-between text-caption text-fg-secondary">
          <span>{t("Visibilidad")}</span>
          <span>{o.opacity}%</span>
        </div>
        <Slider label={t("Visibilidad")} min={10} max={100} step={5} value={o.opacity} valueText={`${o.opacity}%`} onCommit={(opacity) => cambiar({ opacity })} />
      </div>
      <p className="text-caption text-fg-tertiary">{t("Se pone en todas las páginas de cada archivo de la lista. Letras, números y signos habituales (sin emojis).")}</p>
    </div>
  );
}
