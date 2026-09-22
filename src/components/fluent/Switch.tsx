"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { ReactNode } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Ícono mostrado dentro del pulgar (p. ej. sol / luna). */
  thumbIcon?: ReactNode;
  className?: string;
}

/** ToggleSwitch de Fluent: 40x20, pulgar de 12px que crece al presionar. */
export function Switch({ checked, onChange, label, thumbIcon, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "group relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-exit ease-fluent",
        checked
          ? "border-accent bg-accent hover:bg-accent-hover active:bg-accent-pressed"
          : "border-stroke-strong bg-layer hover:bg-layer-alt",
        className,
      )}
    >
      <motion.span
        aria-hidden
        className={clsx(
          "absolute top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full",
          checked ? "bg-accent-on text-accent" : "bg-fg-secondary text-mica",
        )}
        initial={false}
        animate={{ left: checked ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 600, damping: 36 }}
      >
        <span className="flex text-[10px] [&>svg]:h-[10px] [&>svg]:w-[10px]">{thumbIcon}</span>
      </motion.span>
    </button>
  );
}
