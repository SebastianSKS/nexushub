import clsx from "clsx";
import { glifo, type NombreGlifo } from "@/lib/glifos";

interface GlifoProps {
  nombre: NombreGlifo;
  /** Tamaño en px (16 por defecto, como los íconos de la barra de comandos de WinUI). */
  tam?: number;
  className?: string;
}

/**
 * Icono de la aplicación. Decorativo: el nombre accesible lo da el botón que lo contiene.
 *
 * Pinta el SVG de `@fluentui/react-icons` en el tamaño que se le pida. Antes era una letra de `Segoe Fluent Icons`,
 * una fuente que solo existe en Windows: en Linux el navegador pintaba un cuadrado vacío en su lugar.
 *
 * El SVG hereda el color del texto (`currentColor`), así que las clases `text-*` de quien lo usa siguen mandando.
 */
export function Glifo({ nombre, tam = 16, className }: GlifoProps) {
  const Icono = glifo(nombre);
  return <Icono width={tam} height={tam} className={clsx("shrink-0", className)} aria-hidden />;
}
