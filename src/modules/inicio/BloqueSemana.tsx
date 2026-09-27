"use client";

import Link from "next/link";
import clsx from "clsx";
import { useHora } from "@/hooks/useHora";
import { esUrgente, type ItemSemana } from "@/lib/dia";
import { textoDeCuando } from "@/lib/dia-texto";
import { nombreDia } from "@/lib/calendario/fechas";
import { infoCategoria, esCategoria } from "@/lib/calendario/categorias";
import { useT } from "@/lib/i18n";

/**
 * «Esta semana»: lo que cae en los próximos 7 días (tareas, exámenes, citas y cumpleaños), lo más cercano primero. Los
 * exámenes y las tareas de hoy o mañana se destacan para que no se pasen.
 */
export function BloqueSemana({ items }: { items: ItemSemana[] }) {
  const t = useT();
  const { hora } = useHora();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-semibold text-accent-text">{t("Esta semana")}</p>
        <Link href="/calendario" className="text-caption text-accent-text hover:underline">
          {t("Ver calendario")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("No tienes nada para esta semana.")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((i) => {
            const urgente = esUrgente(i);
            const tipo = i.tipo === "evento" && i.categoria && esCategoria(i.categoria) ? t(infoCategoria(i.categoria).nombre) : i.tipo === "cumple" ? t("Cumpleaños") : "";
            return (
              <li key={i.clave} className={clsx("rounded-control flex items-center gap-2 px-2 py-1.5", urgente && "bg-layer-alt")}>
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="min-w-0 flex-1">
                  <span className={clsx("block truncate text-body text-fg", urgente && "font-semibold")}>{i.titulo}</span>
                  {tipo && <span className="block truncate text-caption text-fg-tertiary">{tipo}{i.tipo === "cumple" && i.edad ? ` · ${t("cumple {edad}", { edad: i.edad })}` : ""}</span>}
                </span>
                <span className={clsx("shrink-0 text-caption", i.dias <= 1 ? "font-semibold text-accent-text" : "text-fg-secondary")}>
                  {textoDeCuando(i.dias, i.fecha, nombreDia)}
                  {i.hora && ` · ${hora(i.hora)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
