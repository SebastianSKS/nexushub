"use client";

import { useState } from "react";

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  disabled?: boolean;
  /** Texto legible para lectores de pantalla ("1:05 de 3:20"). */
  valueText?: string;
  /** Se llama al terminar de arrastrar (o al soltar una tecla), no en cada movimiento. */
  onCommit: (value: number) => void;
  /** Se llama en cada cambio; útil para volumen, que responde en vivo. */
  onChange?: (value: number) => void;
}

/** Slider Fluent sobre <input type="range">: teclado y lectores de pantalla nativos. */
export function Slider({ label, value, min = 0, max, step = 1, disabled, valueText, onCommit, onChange }: SliderProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const fill = max > min ? ((shown - min) / (max - min)) * 100 : 0;

  const commit = () => {
    if (drag !== null) onCommit(drag);
    setDrag(null);
  };

  return (
    <input
      type="range"
      className="slider"
      aria-label={label}
      aria-valuetext={valueText}
      min={min}
      max={max}
      step={step}
      value={Math.min(shown, max)}
      disabled={disabled}
      style={{ "--fill": `${fill}%` } as React.CSSProperties}
      onChange={(e) => {
        const v = Number(e.target.value);
        setDrag(v);
        onChange?.(v);
      }}
      onPointerUp={commit}
      onKeyUp={commit}
      onBlur={commit}
    />
  );
}
