import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Obligatorio: un botón solo con ícono necesita nombre accesible. */
  label: string;
  children: ReactNode;
}

/** Botón cuadrado de 32px solo con ícono, estilo "subtle" de Fluent. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, className, children, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={clsx(
          "rounded-control inline-flex h-8 w-8 shrink-0 items-center justify-center text-fg",
          "transition-[background-color,color] duration-exit ease-fluent",
          "hover:bg-layer-alt active:bg-layer active:text-fg-secondary",
          "disabled:pointer-events-none disabled:opacity-40",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
