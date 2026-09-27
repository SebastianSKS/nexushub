"use client";

import { ProgressBar } from "@/components/fluent/ProgressBar";
import { useHora } from "@/hooks/useHora";
import type { EstadoDelDia } from "@/lib/dia";
import { textoDeDuracion } from "@/lib/dia-texto";
import { useT } from "@/lib/i18n";
import { nombreDiaSemana, type Clase } from "@/lib/horario/horario";

/** Una clase con su franja de color: materia, hora y lugar. */
function Franja({ clase, hora, children }: { clase: Clase; hora: (h: string) => string; children?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-stretch gap-3">
      <span aria-hidden className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: clase.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-subtitle text-fg">{clase.materia}</p>
        <p className="truncate text-caption text-fg-secondary">
          {hora(clase.inicio)} – {hora(clase.fin)}
          {clase.aula && ` · ${t("Aula {aula}", { aula: clase.aula })}`}
          {clase.docente && ` · ${clase.docente}`}
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * La parte de las clases de «Tu día»: si estás en clase (cuánto falta para que termine), la que sigue (con cuenta regresiva)
 * o, si ya terminaste, cuándo vuelven. Sin horario cargado no dibuja nada (ya hay una tarjeta que invita a cargarlo).
 */
export function BloqueClases({ estado }: { estado: EstadoDelDia }) {
  const t = useT();
  const { hora } = useHora();
  if (estado.tipo === "sin-horario") return null;

  if (estado.tipo === "en-clase") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-accent-text">{t("Ahora estás en clase")}</p>
        <Franja clase={estado.clase} hora={hora}>
          <p className="mt-1 text-body text-fg">{t("Termina en {tiempo}", { tiempo: textoDeDuracion(estado.minutosParaFin) })}</p>
        </Franja>
        <ProgressBar value={Math.round(estado.progreso * 100)} label={t("Avance de la clase")} />
        {estado.siguiente && (
          <p className="text-caption text-fg-secondary">
            {t("Sigue: {materia} a las {hora}", { materia: estado.siguiente.clase.materia, hora: hora(estado.siguiente.clase.inicio) })}
          </p>
        )}
      </div>
    );
  }

  if (estado.tipo === "siguiente") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-accent-text">{t("Lo que sigue")}</p>
        <Franja clase={estado.clase} hora={hora}>
          <p className="mt-1 text-body text-fg">{t("Empieza en {tiempo}", { tiempo: textoDeDuracion(estado.minutosParaInicio) })}</p>
        </Franja>
      </div>
    );
  }

  const proximo = estado.proximoDia;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-semibold text-accent-text">{estado.tipo === "terminado" ? t("Ya terminaste por hoy") : t("Hoy no tienes clases")}</p>
      {proximo ? (
        <Franja clase={proximo.clase} hora={hora}>
          <p className="mt-1 text-body text-fg-secondary">{proximo.faltan === 1 ? t("Mañana a las {hora}", { hora: hora(proximo.clase.inicio) }) : t("{dia} a las {hora}", { dia: nombreDiaSemana(proximo.dia), hora: hora(proximo.clase.inicio) })}</p>
        </Franja>
      ) : (
        <p className="text-body text-fg-secondary">{t("Disfruta el día libre.")}</p>
      )}
    </div>
  );
}
