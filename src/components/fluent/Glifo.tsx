import clsx from "clsx";
import { glifo, type NombreGlifo } from "@/lib/glifos";

interface GlifoProps {
  nombre: NombreGlifo;
  /** Tamaño en px (16 por defecto, como los íconos de la barra de comandos de WinUI). */
  tam?: number;
  className?: string;
}

/** Ícono de Segoe Fluent Icons. Decorativo: el nombre accesible lo da el botón que lo contiene. */
export function Glifo({ nombre, tam = 16, className }: GlifoProps) {
  return (
    <span
      aria-hidden
      className={clsx("inline-flex shrink-0 select-none items-center justify-center font-glifo leading-none", className)}
      style={{ fontSize: tam, width: tam, height: tam }}
    >
      {glifo(nombre)}
    </span>
  );
}
