"use client";

import { useId, type KeyboardEvent } from "react";
import clsx from "clsx";

interface Option<T> {
  value: T;
  title: string;
  description: string;
}

interface RadioCardsProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}

/** Opciones excluyentes en forma de tarjetas con título y descripción. */
export function RadioCards<T extends string | number>({ label, value, options, onChange }: RadioCardsProps<T>) {
  const labelId = useId();

  const onKeyDown = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    const move = (n: number) => {
      e.preventDefault();
      onChange(options[(n + options.length) % options.length]!.value);
      requestAnimationFrame(() =>
        (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[aria-checked=true]")?.focus(),
      );
    };
    if (e.key === "ArrowDown" || e.key === "ArrowRight") move(i + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") move(i - 1);
  };

  return (
    <div>
      <div id={labelId} className="mb-1.5 text-caption text-fg-secondary">
        {label}
      </div>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className="flex flex-col gap-2">
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
                "rounded-control reveal flex items-start gap-3 border px-3 py-2.5 text-left transition-colors duration-exit ease-fluent",
                checked ? "border-accent bg-layer-alt" : "border-stroke bg-layer hover:bg-layer-alt",
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  checked ? "border-accent bg-accent" : "border-stroke-strong",
                )}
              >
                {checked && <span className="h-1.5 w-1.5 rounded-full bg-accent-on" />}
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold text-fg">{o.title}</span>
                <span className="block text-caption text-fg-secondary">{o.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
