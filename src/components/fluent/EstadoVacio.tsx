import type { ReactNode } from "react";
import clsx from "clsx";
import type { NombreGlifo } from "@/lib/glifos";
import { Card } from "./Card";
import { Glifo } from "./Glifo";

interface EstadoVacioProps {
  glifo: NombreGlifo;
  titulo: string;
  /** Qué es esto y para qué sirve, en una o dos frases. */
  texto: string;
  /** El camino, en pasos cortos («1. Toma una captura…»): un estado vacío que enseña, no que solo avisa. */
  pasos?: string[];
  /** Los botones: el primero suele ser el de acento. */
  acciones?: ReactNode;
  /** Más chico (dentro de una carpeta o una tarjeta lateral). */
  compacto?: boolean;
  className?: string;
}

/**
 * Lo que se ve cuando una sección todavía no tiene nada: en vez de un espacio en blanco, explica qué va ahí, cómo empezar
 * en pocos pasos y trae el botón para hacerlo ya. Un solo formato para todas las secciones vacías.
 */
export function EstadoVacio({ glifo, titulo, texto, pasos, acciones, compacto = false, className }: EstadoVacioProps) {
  return (
    <Card className={clsx("flex flex-col items-center text-center", compacto ? "gap-3 px-5 py-8" : "gap-4 px-6 py-12", className)}>
      <span className={clsx("flex items-center justify-center rounded-full bg-layer-alt text-accent-text", compacto ? "h-11 w-11" : "h-14 w-14")} aria-hidden>
        <Glifo nombre={glifo} tam={compacto ? 20 : 26} />
      </span>
      <div className="max-w-[460px]">
        <h2 className="text-subtitle text-fg">{titulo}</h2>
        <p className="mt-1 text-body text-fg-secondary">{texto}</p>
      </div>
      {pasos && pasos.length > 0 && (
        <ol className="flex max-w-[460px] flex-col gap-1.5 text-left text-body text-fg-secondary">
          {pasos.map((p, i) => (
            <li key={i} className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-layer-alt text-caption font-semibold text-fg">
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      )}
      {acciones && <div className="flex flex-wrap items-center justify-center gap-2">{acciones}</div>}
    </Card>
  );
}
