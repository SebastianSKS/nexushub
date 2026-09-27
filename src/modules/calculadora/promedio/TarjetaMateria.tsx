"use client";

import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { useT } from "@/lib/i18n";
import { estadoMateria, escribirNumero, necesarioParaAprobar, pesoPendiente, pesoSinRepartir, promedioParcial, type Escala, type EstadoMateria, type Materia } from "@/lib/promedio";
import { avisoDePesos, fraseDeNecesario, textoDeEstado } from "@/lib/promedio-texto";
import { usePromedioStore } from "@/store/promedio-store";
import { COLUMNAS_EVALUACION, FilaEvaluacion } from "./FilaEvaluacion";
import { CampoNumero } from "./CampoNumero";

const COLOR_ESTADO: Record<EstadoMateria, string> = {
  "sin-datos": "bg-layer-alt text-fg-secondary",
  "en-curso": "bg-layer-alt text-fg",
  "en-riesgo": "bg-warning/20 text-warning-fg",
  asegurada: "bg-success/20 text-success-fg",
  perdida: "bg-danger/20 text-danger-fg",
  aprobada: "bg-success/20 text-success-fg",
  reprobada: "bg-danger/20 text-danger-fg",
};

/** Una materia: sus evaluaciones, cómo vas y qué necesitas sacar en lo que falta. */
export function TarjetaMateria({ materia, escala }: { materia: Materia; escala: Escala }) {
  const t = useT();
  const cambiarMateria = usePromedioStore((s) => s.cambiarMateria);
  const quitarMateria = usePromedioStore((s) => s.quitarMateria);
  const agregarEvaluacion = usePromedioStore((s) => s.agregarEvaluacion);

  const estado = estadoMateria(materia.evaluaciones, escala);
  const parcial = promedioParcial(materia.evaluaciones);
  const necesario = necesarioParaAprobar(materia.evaluaciones, escala);
  const aviso = avisoDePesos(materia.evaluaciones.reduce((s, e) => s + e.peso, 0));

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          type="text"
          aria-label={t("Nombre de la materia")}
          value={materia.nombre}
          maxLength={60}
          onChange={(e) => cambiarMateria(materia.id, { nombre: e.target.value })}
          className="rounded-input h-8 min-w-0 flex-1 basis-40 border border-transparent bg-transparent px-2 text-subtitle font-semibold text-fg hover:border-stroke hover:bg-layer-alt focus-visible:border-accent focus-visible:outline-none"
        />
        <span className={clsx("rounded-full px-2.5 py-0.5 text-caption font-semibold", COLOR_ESTADO[estado])}>{textoDeEstado(estado)}</span>
        <IconButton label={t("Quitar materia")} onClick={() => quitarMateria(materia.id)}>
          <Glifo nombre="eliminar" />
        </IconButton>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-body text-fg">
          {parcial === null ? t("Todavía no hay calificaciones.") : t("Vas en {n}", { n: escribirNumero(parcial) })}
        </p>
        <label className="ml-auto flex items-center gap-2 text-caption text-fg-secondary">
          {t("Créditos")}
          <span className="w-16">
            <CampoNumero etiqueta={t("Créditos")} valor={materia.creditos} maximo={20} onCambio={(v) => cambiarMateria(materia.id, { creditos: v ?? 1 })} />
          </span>
        </label>
      </div>

      <div className={`grid ${COLUMNAS_EVALUACION} gap-2 text-caption text-fg-tertiary`} aria-hidden="true">
        <span>{t("Evaluación")}</span>
        <span className="text-right">{t("Peso (%)")}</span>
        <span className="text-right">{t("Calificación")}</span>
        <span />
      </div>
      <ul className="flex flex-col gap-2" aria-label={t("Evaluaciones de {materia}", { materia: materia.nombre })}>
        {materia.evaluaciones.map((e) => (
          <FilaEvaluacion key={e.id} materiaId={materia.id} evaluacion={e} maximo={escala.maximo} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="subtle" icon={<Glifo nombre="agregar" />} onClick={() => agregarEvaluacion(materia.id, "", pesoSinRepartir(materia.evaluaciones))}>
          {t("Añadir evaluación")}
        </Button>
        {aviso && (
          <p role="status" className="text-caption text-warning-fg">
            {aviso}
          </p>
        )}
      </div>

      {parcial !== null || pesoPendiente(materia.evaluaciones) < 100 ? (
        <p className="border-t border-stroke pt-3 text-body text-fg-secondary">{fraseDeNecesario(necesario, escala, pesoPendiente(materia.evaluaciones))}</p>
      ) : null}
    </Card>
  );
}
