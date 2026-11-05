"use client";

import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { pendientesDe, useRepasoStore, type Calificacion, type Mazo } from "@/store/repaso-store";
import { rutaMazo } from "./rutas-repaso";

export function SesionEstudio({ mazo }: { mazo: Mazo }) {
  const t = useT();
  const router = useRouter();
  const tarjetas = useRepasoStore((s) => s.tarjetas);

  // La «pila» de la sesión se fija al entrar (ids); así calificar no la reordena sola. «Otra vez» reencola al final.
  const [pila, setPila] = useState<string[]>(() => pendientesDe(useRepasoStore.getState().tarjetas, mazo.id).map((c) => c.id));
  const [mostrada, setMostrada] = useState(false);
  const [hechas, setHechas] = useState(0);

  const volver = rutaMazo(mazo.id);
  const idActual = pila[0];
  const actual = idActual ? tarjetas.find((c) => c.id === idActual) : undefined;

  const calificar = useCallback(
    (cal: Calificacion) => {
      if (!idActual) return;
      useRepasoStore.getState().calificar(idActual, cal);
      setPila((p) => (cal === "otra" ? [...p.slice(1), p[0]!] : p.slice(1)));
      setMostrada(false);
      if (cal !== "otra") setHechas((n) => n + 1);
    },
    [idActual],
  );

  // Teclado: Espacio/Enter voltea; 1 = otra vez, 2 = bien, 3 = fácil.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!actual) return;
      if (!mostrada && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setMostrada(true);
      } else if (mostrada) {
        if (e.key === "1") calificar("otra");
        else if (e.key === "2") calificar("bien");
        else if (e.key === "3") calificar("facil");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actual, mostrada, calificar]);

  const terminado = !actual;

  return (
    <PlantillaPagina
      migas={[{ etiqueta: t("Repaso"), href: "/repaso" }, { etiqueta: mazo.nombre, href: volver }, { etiqueta: t("Estudiar") }]}
      titulo={mazo.nombre}
      descripcion={terminado ? t("Sesión terminada") : t("Quedan {n}", { n: pila.length })}
      principal={
        terminado ? (
          <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-12 text-center">
            <Glifo nombre="exito" tam={48} />
            <h2 className="text-title text-fg">{t("¡Listo por hoy!")}</h2>
            <p className="text-body text-fg-secondary">{t("Repasaste {n} tarjetas de «{nombre}». Nexo te las volverá a mostrar cuando toque.", { n: hechas, nombre: mazo.nombre })}</p>
            <Button variant="accent" onClick={() => router.push(volver)}>
              {t("Volver al mazo")}
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[640px] flex-col items-stretch gap-4">
            <div className="h-1 overflow-hidden rounded-full bg-layer-alt">
              <div className="h-full rounded-full bg-accent transition-[width] duration-exit" style={{ width: `${(hechas / (hechas + pila.length)) * 100}%` }} />
            </div>

            <div className="flex min-h-[260px] flex-col rounded-card border border-stroke bg-layer p-6 shadow-card">
              <span className="text-caption text-fg-tertiary">{t("Pregunta")}</span>
              <p className="mt-1 whitespace-pre-wrap text-title text-fg">{actual.frente}</p>
              {mostrada && (
                <>
                  <hr className="my-4 border-stroke" />
                  <span className="text-caption text-fg-tertiary">{t("Respuesta")}</span>
                  <p className="mt-1 whitespace-pre-wrap text-subtitle text-fg-secondary">{actual.reverso}</p>
                </>
              )}
            </div>

            {!mostrada ? (
              <Button variant="accent" className="h-11" onClick={() => setMostrada(true)}>
                {t("Mostrar respuesta")}
              </Button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Button className="h-11" onClick={() => calificar("otra")}>
                  {t("Otra vez")}
                </Button>
                <Button className="h-11" onClick={() => calificar("bien")}>
                  {t("Bien")}
                </Button>
                <Button variant="accent" className="h-11" onClick={() => calificar("facil")}>
                  {t("Fácil")}
                </Button>
              </div>
            )}

            <Button variant="subtle" className="self-center" onClick={() => router.push(volver)}>
              {t("Terminar")}
            </Button>
          </div>
        )
      }
    />
  );
}
