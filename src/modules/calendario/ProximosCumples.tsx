"use client";

import { useT, localeActual } from "@/lib/i18n";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { cuando, fechaLarga, mayuscula, proximoCumple } from "@/lib/calendario/fechas";
import type { Amigo } from "@/store/calendario-store";

/** Los próximos cumpleaños, del más cercano al más lejano. Al pulsar uno se edita. */
export function ProximosCumples({ amigos, onAmigo }: { amigos: Amigo[]; onAmigo: (a: Amigo) => void }) {
  const t = useT();
  const hoy = new Date();
  const lista = amigos
    .map((a) => ({ a, p: proximoCumple(a, hoy) }))
    .sort((x, y) => x.p.dias - y.p.dias || x.a.nombre.localeCompare(y.a.nombre, localeActual()))
    .slice(0, 6);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-body font-semibold text-fg">{t("Próximos cumpleaños")}</h2>
      {lista.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("Aún no has añadido a nadie. Pulsa «Añadir cumpleaños» arriba.")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {lista.map(({ a, p }) => (
            <li key={a.id}>
              <button type="button" onClick={() => onAmigo(a)} className="rounded-control reveal flex w-full items-center gap-3 px-2 py-2 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: a.color }} aria-hidden>
                  {p.dias === 0 ? <Glifo nombre="calendario" tam={16} /> : <span className="text-body font-semibold">{a.nombre.charAt(0).toUpperCase()}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-fg">{a.nombre}</span>
                  <span className="block truncate text-caption text-fg-secondary">
                    {mayuscula(fechaLarga(p.fecha))}
                    {p.edad ? ` · ${t("cumple {edad}", { edad: p.edad })}` : ""}
                  </span>
                </span>
                <span className={p.dias <= 1 ? "shrink-0 text-caption font-semibold text-accent-text" : "shrink-0 text-caption text-fg-secondary"}>{cuando(p.dias)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
