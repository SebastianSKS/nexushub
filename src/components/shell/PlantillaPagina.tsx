"use client";

import { useEffect, type ReactNode } from "react";
import { useNavStore } from "@/store/nav-store";
import { BotonGuia } from "./BotonGuia";
import { Migas, type Miga } from "./Migas";

interface PlantillaPaginaProps {
  migas: Miga[];
  titulo: string;
  descripcion: string;
  /** La ÚNICA acción primaria de la página: botón de acento, arriba a la derecha. */
  accion?: ReactNode;
  /** Si la acción está desactivada: una línea de 12 px que explica por qué. */
  motivo?: string | null;
  principal: ReactNode;
  /** Panel lateral de 320 px (opciones, resumen). Debajo del principal si la ventana mide menos de 1100 px. */
  lateral?: ReactNode;
}

/**
 * Plantilla ÚNICA de página, la de la app Configuración de Windows:
 *
 *   breadcrumb (32 px)
 *   título 28 px + descripción 14 px ................. [acción primaria]
 *   ┌────────── panel principal ─────────┬─ panel lateral 320 px ─┐
 *
 * Toda pantalla usa esta estructura; ninguna inventa su propio formato.
 */
export function PlantillaPagina({ migas, titulo, descripcion, accion, motivo, principal, lateral }: PlantillaPaginaProps) {
  const setPadre = useNavStore((s) => s.setPadre);

  // Escape sube un nivel: el padre es la miga anterior a la actual.
  const padre = migas.length > 1 ? (migas[migas.length - 2]?.href ?? null) : null;
  useEffect(() => {
    setPadre(padre);
    return () => setPadre(null);
  }, [padre, setPadre]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-6 pb-8 pt-2 min-[1100px]:px-8">
      <Migas migas={migas} />

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h1 className="text-title text-fg">{titulo}</h1>
            <BotonGuia />
          </div>
          <p className="mt-1 text-body text-fg-secondary">{descripcion}</p>
        </div>
        {accion && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {accion}
            {motivo && (
              <p className="max-w-[300px] text-right text-caption text-fg-tertiary" role="status">
                {motivo}
              </p>
            )}
          </div>
        )}
      </header>

      <div className={lateral ? "grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]" : ""}>
        <div className="flex min-w-0 flex-col gap-5">{principal}</div>
        {lateral && <aside className="flex min-w-0 flex-col gap-4 min-[1100px]:sticky min-[1100px]:top-2">{lateral}</aside>}
      </div>
    </div>
  );
}
