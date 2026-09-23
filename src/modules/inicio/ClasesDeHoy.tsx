"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Card } from "@/components/fluent/Card";
import { DIAS, diaDeSemana, estadoDelDia, proximoDiaConClases } from "@/lib/horario/horario";
import { useHorarioStore } from "@/store/horario-store";

/** «Lo que sigue hoy»: las clases del día con la que está en curso y la que viene marcadas. */
export function ClasesDeHoy() {
  const clases = useHorarioStore((s) => s.clases);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    useHorarioStore.getState().cargar();
    const t = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (clases.length === 0) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-body text-fg-secondary">¿Tienes tu horario de clases en una imagen? NexusHub lo lee y te dice qué clase sigue.</p>
        <Link href="/horario" className="rounded-control inline-flex h-8 items-center border border-stroke bg-layer-alt px-4 text-body text-fg shadow-card transition-colors duration-exit ease-fluent hover:bg-layer">
          Escanear mi horario
        </Link>
      </Card>
    );
  }

  const hoy = diaDeSemana(ahora);
  const delDia = estadoDelDia(clases, hoy, ahora);
  const quedan = delDia.some((x) => x.estado !== "terminada");
  const proximo = quedan ? null : proximoDiaConClases(clases, ahora);
  const mostrar = quedan ? delDia : proximo ? estadoDelDia(clases, proximo.dia, ahora).map((x) => ({ ...x, estado: "despues" as const })) : delDia;

  const titulo = quedan
    ? "Lo que sigue hoy"
    : proximo
      ? `Hoy ya no tienes clases · ${proximo.faltan === 1 ? "Mañana" : DIAS[proximo.dia]}`
      : delDia.length > 0
        ? "Hoy ya terminaste tus clases"
        : "Hoy no tienes clases";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-body font-semibold text-fg">{titulo}</h2>
        <Link href="/horario" className="text-caption text-accent-text hover:underline">Ver horario</Link>
      </div>
      {mostrar.length === 0 ? (
        <p className="text-body text-fg-secondary">Disfruta el día libre.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {mostrar.map(({ clase, estado }) => (
            <li key={clase.id} className={clsx("rounded-control flex items-center gap-3 px-2 py-2", estado === "ahora" && "bg-layer-alt", estado === "terminada" && "opacity-55")}>
              <span aria-hidden className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: clase.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-fg">{clase.materia}</span>
                <span className="block truncate text-caption text-fg-secondary">
                  {clase.inicio} – {clase.fin}
                  {clase.aula && ` · Aula ${clase.aula}`}
                  {clase.docente && ` · ${clase.docente}`}
                </span>
              </span>
              {estado === "ahora" && <span className="shrink-0 text-caption font-semibold text-accent-text">Ahora</span>}
              {estado === "siguiente" && <span className="shrink-0 text-caption font-semibold text-accent-text">Sigue</span>}
              {estado === "terminada" && <span className="shrink-0 text-caption text-fg-tertiary">Terminó</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
