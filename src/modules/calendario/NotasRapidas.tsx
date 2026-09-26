"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { useNotasStore } from "@/store/notas-store";

/** Lista corta de pendientes junto al calendario: sin fecha, solo escribir y tachar. */
export function NotasRapidas() {
  const t = useT();
  const notas = useNotasStore((s) => s.notas);
  const { agregar, alternar, quitar } = useNotasStore.getState();
  const [texto, setTexto] = useState("");

  useEffect(() => useNotasStore.getState().cargar(), []);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    useNotasStore.getState().agregar(texto);
    setTexto("");
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-body font-semibold text-fg">
        <Glifo nombre="agregar" tam={16} className="text-accent-text" /> {t("Notas rápidas")}
      </h2>

      <form onSubmit={enviar} className="mb-3 flex gap-2">
        <label htmlFor="nueva-nota" className="sr-only">
          {t("Nueva nota")}
        </label>
        <input
          id="nueva-nota"
          value={texto}
          maxLength={200}
          placeholder={t("Escribe algo y pulsa Enter…")}
          onChange={(e) => setTexto(e.target.value)}
          className="h-8 flex-1 rounded-input border border-stroke bg-layer-alt px-3 text-body text-fg placeholder:text-fg-tertiary transition-colors duration-exit ease-fluent hover:bg-layer focus-visible:border-accent focus-visible:outline-none"
        />
      </form>

      {notas.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("Sin pendientes por ahora.")}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {notas.map((n) => (
            <li key={n.id} className="reveal group flex items-center gap-2 rounded-control px-1 py-1.5 hover:bg-layer-alt">
              <button
                type="button"
                role="checkbox"
                aria-checked={n.hecha}
                aria-label={n.texto}
                onClick={() => alternar(n.id)}
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors duration-exit ease-fluent",
                  n.hecha ? "border-accent bg-accent text-accent-on" : "border-stroke-strong",
                )}
              >
                {n.hecha && <Glifo nombre="exito" tam={11} />}
              </button>
              <span className={clsx("min-w-0 flex-1 truncate text-body", n.hecha ? "text-fg-tertiary line-through" : "text-fg")}>{n.texto}</span>
              <IconButton label={t("Quitar «{texto}»", { texto: n.texto })} onClick={() => quitar(n.id)} className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                <Glifo nombre="cerrar" tam={9} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
