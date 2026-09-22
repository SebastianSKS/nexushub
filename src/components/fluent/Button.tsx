import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export type ButtonVariant = "accent" | "standard" | "subtle";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  accent:
    "bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-pressed border border-stroke shadow-card",
  standard:
    "bg-layer-alt text-fg hover:bg-layer active:bg-layer active:text-fg-secondary border border-stroke shadow-card reveal",
  subtle:
    "bg-transparent text-fg hover:bg-layer-alt active:bg-layer active:text-fg-secondary border border-transparent",
};

/** Botón Fluent. 8px de radio, 32px de alto, transiciones con la curva Fluent. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "standard", icon, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "rounded-control inline-flex h-8 min-w-[32px] select-none items-center justify-center gap-2 px-4 text-body",
        "transition-[background-color,color,transform] duration-exit ease-fluent",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
