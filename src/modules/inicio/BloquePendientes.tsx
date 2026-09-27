"use client";

import Link from "next/link";
import clsx from "clsx";
import { useT } from "@/lib/i18n";
import { useNotasStore } from "@/store/notas-store";

/** «Pendientes»: los primeros apuntes sin tachar de las notas rápidas, que se pueden marcar como hechos desde aquí. */
export function BloquePendientes({ total, primeros }: { total: number; primeros: { id: string; texto: string }[] }) {
  const t = useT();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-semibold text-accent-text">{total > 0 ? t("Pendientes ({n})", { n: total }) : t("Pendientes")}</p>
        <Link href="/calendario" className="text-caption text-accent-text hover:underline">
          {total > primeros.length ? t("Ver todos") : t("Notas rápidas")}
        </Link>
      </div>
      {primeros.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("Sin pendientes. ¡Buen trabajo!")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {primeros.map((n) => (
            <li key={n.id}>
              <label className={clsx("rounded-control flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors duration-exit ease-fluent hover:bg-layer-alt")}>
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--accent)]" checked={false} onChange={() => useNotasStore.getState().alternar(n.id)} aria-label={t("Marcar como hecho: {texto}", { texto: n.texto })} />
                <span className="min-w-0 flex-1 truncate text-body text-fg">{n.texto}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
