"use client";

import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { ProgressBar } from "@/components/fluent/ProgressBar";
import { usePrimerosPasos } from "@/hooks/usePrimerosPasos";
import { useT } from "@/lib/i18n";
import type { PasoId } from "@/lib/primeros-pasos";
import { useAppStore } from "@/store/app-store";

/**
 * «Primeros pasos»: cinco cosas para sacarle provecho a Nexo desde el primer día, con casillas que se marcan solas cuando la
 * persona las hace. Va en Inicio, no es una ventana: no tapa nada, no se mete con las guías (espera a que la bienvenida y
 * cualquier otra guía se cierren) y se puede ocultar. Al terminar se despide sola.
 */
export function PrimerosPasos({ onNombre }: { onNombre: () => void }) {
  const t = useT();
  const { visible, celebrando, pasos, progreso, descartar } = usePrimerosPasos();
  if (!visible) return null;

  const hacer = (id: PasoId) => {
    if (id === "nombre") onNombre();
    else if (id === "buscador") useAppStore.getState().setSearchOpen(true);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div role="region" aria-label={t("Primeros pasos")} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-subtitle text-fg">{celebrando ? t("¡Listo! Ya conoces lo básico") : t("Primeros pasos")}</h2>
            <p className="mt-0.5 text-caption text-fg-secondary">
              {celebrando ? t("Todo lo demás lo vas descubriendo con «¿Cómo funciona?» en cada sección.") : t("{hechos} de {total} — para sacarle provecho a Nexo desde hoy.", { hechos: progreso.hechos, total: progreso.total })}
            </p>
          </div>
          {!celebrando && (
            <Button variant="subtle" onClick={descartar}>
              {t("Ocultar")}
            </Button>
          )}
        </div>

        <ProgressBar value={Math.round((progreso.hechos / Math.max(1, progreso.total)) * 100)} label={t("Avance de los primeros pasos")} />

        <ol className="flex flex-col gap-1">
          {pasos.map((p) => {
            const esSiguiente = progreso.siguiente === p.id && !celebrando;
            return (
              <li key={p.id} className={clsx("rounded-control flex items-start gap-3 px-2 py-2", esSiguiente && "bg-layer-alt")}>
                <span
                  aria-hidden
                  className={clsx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", p.hecho ? "border-transparent bg-accent text-accent-on" : "border-stroke text-fg-secondary")}
                >
                  <Glifo nombre={p.hecho ? "exito" : p.glifo} tam={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={clsx("text-body", p.hecho ? "text-fg-secondary line-through" : "font-semibold text-fg")}>
                    {t(p.titulo)}
                    <span className="sr-only">{p.hecho ? ` — ${t("hecho")}` : ` — ${t("pendiente")}`}</span>
                  </p>
                  {esSiguiente && <p className="mt-0.5 text-caption text-fg-secondary">{t(p.texto)}</p>}
                </div>
                {!p.hecho &&
                  (p.ruta ? (
                    <Link
                      href={p.ruta}
                      className={clsx("rounded-control inline-flex h-8 shrink-0 items-center border px-3 text-body transition-colors duration-exit ease-fluent", esSiguiente ? "border-transparent bg-accent text-accent-on hover:bg-accent-hover" : "border-stroke bg-layer-alt text-fg hover:bg-layer")}
                    >
                      {t(p.accion)}
                    </Link>
                  ) : (
                    <Button variant={esSiguiente ? "accent" : "standard"} onClick={() => hacer(p.id)}>
                      {t(p.accion)}
                    </Button>
                  ))}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
