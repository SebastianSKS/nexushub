"use client";

import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { useT } from "@/lib/i18n";
import type { Evaluacion } from "@/lib/promedio";
import { usePromedioStore } from "@/store/promedio-store";
import { CampoNumero } from "./CampoNumero";

/** Columnas de una fila de evaluación: nombre, peso, calificación y el botón de quitar. La tarjeta usa las mismas para su encabezado. */
export const COLUMNAS_EVALUACION = "grid-cols-[minmax(0,1fr)_76px_92px_32px]";

interface FilaEvaluacionProps {
  materiaId: string;
  evaluacion: Evaluacion;
  maximo: number;
}

/** Una evaluación de una materia: cómo se llama, cuánto pesa y qué calificación sacaste (vacía si todavía no se califica). */
export function FilaEvaluacion({ materiaId, evaluacion, maximo }: FilaEvaluacionProps) {
  const t = useT();
  const cambiar = usePromedioStore((s) => s.cambiarEvaluacion);
  const quitar = usePromedioStore((s) => s.quitarEvaluacion);

  return (
    <li className={`grid ${COLUMNAS_EVALUACION} items-center gap-2`}>
      <input
        type="text"
        aria-label={t("Nombre de la evaluación")}
        value={evaluacion.nombre}
        maxLength={60}
        placeholder={t("Examen, tarea, proyecto…")}
        onChange={(e) => cambiar(materiaId, evaluacion.id, { nombre: e.target.value })}
        className="rounded-input h-8 w-full min-w-0 border border-stroke bg-layer-alt px-2 text-body text-fg placeholder:text-fg-tertiary hover:bg-layer focus-visible:border-accent focus-visible:outline-none"
      />
      <CampoNumero etiqueta={t("Peso en porcentaje")} valor={evaluacion.peso} maximo={100} onCambio={(v) => cambiar(materiaId, evaluacion.id, { peso: v ?? 0 })} />
      <CampoNumero
        etiqueta={t("Calificación")}
        valor={evaluacion.calificacion}
        maximo={maximo}
        placeholder="—"
        onCambio={(v) => cambiar(materiaId, evaluacion.id, { calificacion: v })}
      />
      <IconButton label={t("Quitar evaluación")} onClick={() => quitar(materiaId, evaluacion.id)}>
        <Glifo nombre="eliminar" />
      </IconButton>
    </li>
  );
}
