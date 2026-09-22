import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";

interface CardProps extends ComponentPropsWithRef<"div"> {
  /** Activa el resplandor Reveal en el borde. */
  reveal?: boolean;
}

/** Tarjeta Fluent: capa translúcida, borde fino, 8px de radio y elevación de dos capas. */
export function Card({ reveal = false, className, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-control border border-stroke bg-layer shadow-card",
        reveal && "reveal",
        className,
      )}
      {...rest}
    />
  );
}
