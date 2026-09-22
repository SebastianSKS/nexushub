"use client";

import { Card } from "@/components/fluent/Card";
import { cuando, diasHastaIso, fechaDesdeIso, fechaLarga, mayuscula } from "@/lib/calendario/fechas";
import type { Evento } from "@/store/calendario-store";

/** Los próximos eventos (hoy en adelante), del más cercano al más lejano. No se muestra si no hay ninguno. */
export function ProximosEventos({ eventos, onEvento }: { eventos: Evento[]; onEvento: (e: Evento) => void }) {
  const hoy = new Date();
  const lista = eventos
    .map((e) => ({ e, dias: diasHastaIso(e.fecha, hoy) }))
    .filter((x) => x.dias >= 0)
    .sort((x, y) => x.dias - y.dias || x.e.titulo.localeCompare(y.e.titulo, "es"))
    .slice(0, 6);

  if (lista.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-body font-semibold text-fg">Próximos eventos</h2>
      <ul className="flex flex-col gap-1">
        {lista.map(({ e, dias }) => (
          <li key={e.id}>
            <button type="button" onClick={() => onEvento(e)} className="rounded-control reveal flex w-full items-center gap-3 px-2 py-2 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body font-semibold text-white" style={{ backgroundColor: e.color }} aria-hidden>
                {e.titulo.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-fg">{e.titulo}</span>
                <span className="block truncate text-caption text-fg-secondary">
                  {mayuscula(fechaLarga(fechaDesdeIso(e.fecha)))}
                  {e.hora ? ` · ${e.hora}` : ""}
                </span>
              </span>
              <span className={dias <= 1 ? "shrink-0 text-caption font-semibold text-accent-text" : "shrink-0 text-caption text-fg-secondary"}>{cuando(dias)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
