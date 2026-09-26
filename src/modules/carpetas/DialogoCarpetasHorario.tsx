"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { crearCarpeta, ErrorCarpetas, listarCarpetas, nombreCarpetaDe } from "@/services/carpetas";

/**
 * Tras guardar un horario: «¿Quieres una carpeta para las tareas de cada materia?». Se ofrece solo lo que aún no
 * tiene carpeta, todo viene marcado y se puede desmarcar. Nunca se crea nada sin pulsar el botón.
 */
export function DialogoCarpetasHorario({ abierto, materias, onCerrar }: { abierto: boolean; materias: string[]; onCerrar: () => void }) {
  const t = useT();
  const [faltan, setFaltan] = useState<string[]>([]);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creadas, setCreadas] = useState<number | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setCargando(true);
    setError(null);
    setCreadas(null);
    listarCarpetas()
      .then((existentes) => {
        const ya = new Set(existentes.map((c) => c.nombre.toLowerCase()));
        const unicas = [...new Set(materias.map((m) => m.trim()).filter(Boolean))];
        const pendientes = unicas.filter((m) => !ya.has(nombreCarpetaDe(m).toLowerCase()));
        setFaltan(pendientes);
        setElegidas(new Set(pendientes));
      })
      .catch((e: unknown) => setError(e instanceof ErrorCarpetas ? e.message : t("No se pudieron leer tus carpetas.")))
      .finally(() => setCargando(false));
  }, [abierto, materias]);

  const crear = async () => {
    setError(null);
    let hechas = 0;
    const fallos: string[] = [];
    for (const m of faltan.filter((x) => elegidas.has(x))) {
      try {
        await crearCarpeta(nombreCarpetaDe(m));
        hechas++;
      } catch {
        fallos.push(m);
      }
    }
    setCreadas(hechas);
    if (fallos.length) setError(t("No se pudo crear: {lista}. Puedes crearlas a mano en «Mis tareas».", { lista: fallos.join(", ") }));
  };

  const alternar = (m: string) =>
    setElegidas((s) => {
      const n = new Set(s);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });

  return (
    <Dialog open={abierto} onClose={onCerrar} title={t("¿Crear carpetas para tus tareas?")} maxWidth={520}>
      {cargando ? (
        <p className="py-4 text-body text-fg-secondary">{t("Revisando tus carpetas…")}</p>
      ) : creadas !== null ? (
        <div className="flex flex-col gap-4">
          {creadas > 0 && (
            <InfoBar severity="success" title={creadas === 1 ? t("1 carpeta creada") : t("{n} carpetas creadas", { n: creadas })}>
              {t("Quedan en Documentos › Nexo › Tareas. Ahí guardas los trabajos de cada materia.")}
            </InfoBar>
          )}
          {error && <InfoBar severity="warning" title={t("Algo no salió")}>{error}</InfoBar>}
          <div className="flex justify-end gap-2">
            <Button onClick={onCerrar}>{t("Cerrar")}</Button>
            <Link href="/documentos/carpetas" onClick={onCerrar} className="rounded-control inline-flex h-8 items-center bg-accent px-4 text-body text-accent-on shadow-card transition-colors duration-exit ease-fluent hover:bg-accent-hover">
              {t("Ver mis tareas")}
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col gap-4">
          <InfoBar severity="error" title={t("No se pudo continuar")}>{error}</InfoBar>
          <div className="flex justify-end">
            <Button onClick={onCerrar}>{t("Cerrar")}</Button>
          </div>
        </div>
      ) : faltan.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg">{t("Todas tus materias ya tienen su carpeta. No hace falta crear nada.")}</p>
          <div className="flex justify-end">
            <Button onClick={onCerrar}>{t("Cerrar")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">
            {t("Una carpeta por materia, para guardar ahí las tareas y trabajos. Desmarca las que no quieras; siempre puedes añadir, renombrar o quitar carpetas después.")}
          </p>
          <ul className="flex max-h-[260px] flex-col gap-1 overflow-y-auto pr-1" aria-label={t("Materias sin carpeta")}>
            {faltan.map((m) => {
              const marcada = elegidas.has(m);
              return (
                <li key={m}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={marcada}
                    onClick={() => alternar(m)}
                    className="rounded-control flex w-full items-center gap-3 border border-stroke bg-layer px-3 py-2 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt"
                  >
                    <span aria-hidden className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border", marcada ? "border-accent bg-accent text-accent-on" : "border-stroke-strong")}>
                      {marcada && <Glifo nombre="exito" tam={12} />}
                    </span>
                    <Glifo nombre="carpeta" tam={16} className="text-fg-secondary" />
                    <span className="min-w-0 flex-1 truncate text-body text-fg">{nombreCarpetaDe(m)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end gap-2">
            <Button onClick={onCerrar}>{t("Ahora no")}</Button>
            <Button variant="accent" disabled={elegidas.size === 0} onClick={() => void crear()}>
              {elegidas.size === 1 ? t("Crear 1 carpeta") : t("Crear {n} carpetas", { n: elegidas.size })}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
