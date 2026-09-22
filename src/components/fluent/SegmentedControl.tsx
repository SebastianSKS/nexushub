"use client";

import { useId, type KeyboardEvent } from "react";
import clsx from "clsx";

interface Option<T> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** false = la etiqueta solo la leen los lectores de pantalla (cuando el título ya está al lado). */
  etiquetaVisible?: boolean;
}

/** Grupo de opciones excluyentes en línea (radiogroup con flechas de teclado). */
export function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
  etiquetaVisible = true,
}: SegmentedControlProps<T>) {
  const labelId = useId();

  const onKeyDown = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    const move = (n: number) => {
      e.preventDefault();
      const next = options[(n + options.length) % options.length]!;
      onChange(next.value);
      // El foco sigue a la selección (patrón roving tabindex).
      requestAnimationFrame(() =>
        (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[aria-checked=true]")?.focus(),
      );
    };
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(i - 1);
  };

  return (
    <div>
      <div id={labelId} className={etiquetaVisible ? "mb-1.5 text-caption text-fg-secondary" : "sr-only"}>
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        className={clsx(
          "grid gap-1 rounded-control border border-stroke bg-layer p-1",
          disabled && "pointer-events-none opacity-40",
        )}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={clsx(
                "h-8 rounded-[6px] px-2 text-body transition-colors duration-exit ease-fluent",
                checked ? "bg-accent text-accent-on" : "text-fg-secondary hover:bg-layer-alt hover:text-fg",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
