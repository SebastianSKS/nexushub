"use client";

import { useT } from "@/lib/i18n";
import clsx from "clsx";
import { infoCategoria } from "@/lib/calendario/categorias";
import { Glifo } from "@/components/fluent/Glifo";
import { diasDeLaSemana, fechaLarga, inicioDelDia, mayuscula, nombreDia, nombreMes } from "@/lib/calendario/fechas";
import { itemsDelDia } from "@/lib/calendario/items";
import type { Amigo, Evento } from "@/store/calendario-store";

interface Props {
  fechaBase: Date;
  amigos: Amigo[];
  eventos: Evento[];
  onSemana: (delta: -1 | 1) => void;
  onHoy: () => void;
  onDia: (fecha: Date) => void;
  onAmigo: (a: Amigo) => void;
  onEvento: (e: Evento) => void;
}

/** Agenda de la semana: un día por fila, con todo lo que cae ahí (cumpleaños y eventos, con su hora). */
export function VistaSemana({ fechaBase, amigos, eventos, onSemana, onHoy, onDia, onAmigo, onEvento }: Props) {
  const t = useT();
  const hoy = inicioDelDia(new Date());
  const dias = diasDeLaSemana(fechaBase);
  const esEstaSemana = dias.some((d) => d.getTime() === hoy.getTime());
  const mismoMes = dias[0]!.getMonth() === dias[6]!.getMonth();
  const titulo = mismoMes
    ? t("{a} – {b} de {mes}", { a: dias[0]!.getDate(), b: dias[6]!.getDate(), mes: nombreMes(dias[0]!.getMonth()) })
    : t("{a} de {mes} – {b} de {mesb}", { a: dias[0]!.getDate(), mes: nombreMes(dias[0]!.getMonth()), b: dias[6]!.getDate(), mesb: nombreMes(dias[6]!.getMonth()) });

  return (
    <section aria-label={t("Semana del {titulo}", { titulo })} className="overflow-hidden rounded-[8px] border border-stroke bg-layer shadow-card">
      <header className="flex items-center gap-2 px-4 py-3" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd 0%, #2b88d8 60%, #4aa8ee 100%)" }}>
        <h2 className="flex-1 text-subtitle text-white" aria-live="polite">
          {mayuscula(titulo)} <span className="font-normal opacity-80">{dias[0]!.getFullYear()}</span>
        </h2>
        <button type="button" onClick={onHoy} disabled={esEstaSemana} className="rounded-control h-8 px-3 text-body text-white transition-colors duration-exit ease-fluent hover:bg-white/15 disabled:opacity-50 disabled:hover:bg-transparent">
          {t("Hoy")}
        </button>
        <button type="button" onClick={() => onSemana(-1)} aria-label={t("Semana anterior")} title={t("Semana anterior")} className="rounded-control flex h-8 w-8 items-center justify-center text-white transition-colors duration-exit ease-fluent hover:bg-white/15">
          <Glifo nombre="chevronIzquierda" tam={14} />
        </button>
        <button type="button" onClick={() => onSemana(1)} aria-label={t("Semana siguiente")} title={t("Semana siguiente")} className="rounded-control flex h-8 w-8 items-center justify-center text-white transition-colors duration-exit ease-fluent hover:bg-white/15">
          <Glifo nombre="chevronDerecha" tam={14} />
        </button>
      </header>

      <ul className="divide-y divide-stroke">
        {dias.map((fecha) => {
          const esHoy = fecha.getTime() === hoy.getTime();
          const items = itemsDelDia(amigos, eventos, fecha);
          return (
            <li key={fecha.toISOString()} className={clsx("flex gap-4 p-4", esHoy && "bg-layer-alt")}>
              <div className="w-[92px] shrink-0">
                <span className={clsx("block text-body font-semibold", esHoy ? "text-accent-text" : "text-fg")}>{mayuscula(nombreDia(fecha))}</span>
                <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full text-body", esHoy ? "bg-accent font-semibold text-accent-on" : "text-fg-secondary")}>{fecha.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                {items.length === 0 ? (
                  <button type="button" onClick={() => onDia(fecha)} aria-label={t("{fecha}, sin nada. Añadir", { fecha: fechaLarga(fecha) })} className="rounded-control flex items-center gap-1.5 text-body text-fg-tertiary transition-colors duration-exit ease-fluent hover:text-accent-text">
                    <Glifo nombre="agregar" tam={12} />
                    {t("Sin nada por ahora")}
                  </button>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {items.map((it) => (
                      <li key={it.clave}>
                        <button
                          type="button"
                          onClick={() => (it.tipo === "amigo" ? onAmigo(it.ref as Amigo) : onEvento(it.ref as Evento))}
                          aria-label={t("Editar «{titulo}»", { titulo: it.titulo })}
                          className="rounded-control flex w-full items-center gap-2 py-1 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt"
                        >
                          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                          <span className="min-w-0 flex-1 truncate text-body text-fg">
                            {it.tipo === "amigo" ? t("Cumpleaños de {nombre}", { nombre: it.titulo }) : it.titulo}
                          </span>
                          {it.tipo === "evento" && (it.ref as Evento).categoria !== "otro" && (
                            <span className="shrink-0 rounded-full px-2 text-caption font-semibold" style={{ backgroundColor: it.color, color: "#fff" }}>
                              {t(infoCategoria((it.ref as Evento).categoria).nombre)}
                            </span>
                          )}
                          {it.hora && <span className="shrink-0 text-caption text-fg-secondary">{it.hora}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
