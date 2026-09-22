import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps } from "react";
import type { ButtonVariant } from "./Button";

const VARIANTES: Record<ButtonVariant, string> = {
  accent: "bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-pressed border border-stroke shadow-card",
  standard: "bg-layer-alt text-fg hover:bg-layer active:bg-layer border border-stroke shadow-card reveal",
  subtle: "bg-transparent text-fg hover:bg-layer-alt active:bg-layer border border-transparent",
};

/** Botón que navega: es un <a> real (clic con rueda, menú contextual), con la apariencia de un Button. */
export function BotonEnlace({ variant = "standard", className, ...rest }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={clsx(
        "rounded-control inline-flex h-8 min-w-[32px] select-none items-center justify-center gap-2 px-4 text-body",
        "transition-[background-color,color] duration-exit ease-fluent",
        VARIANTES[variant],
        className,
      )}
      {...rest}
    />
  );
}
