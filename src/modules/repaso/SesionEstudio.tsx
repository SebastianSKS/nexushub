"use client";

import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { Kbd } from "@/components/fluent/Kbd";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { programar, proximoRepaso, useRepasoStore, type Calificacion, type Mazo } from "@/store/repaso-store";
import { cuandoToca } from "./cuando";
import { rutaMazo } from "./rutas-repaso";

interface Ronda {
  /** Identifica este repaso en el historial. */
  id: string;
  practica: boolean;
  pila: string[];
  /** Todas las tarjetas con las que empezó, para poder repetirla. */
  inicial: string[];
  /** La primera calificación de cada tarjeta. */
  primera: Record<string, Calificacion>;
  hechas: number;
}

const nuevaRonda = (ids: string[], practica: boolean): Ronda => ({ id: crypto.randomUUID(), practica, pila: ids, inicial: ids, primera: {}, hechas: 0 });

export function SesionEstudio({ mazo, ids, practica }: { mazo: Mazo; ids: string[]; practica: boolean }) {
  const t = useT();
  const router = useRouter();
  const tarjetas = useRepasoStore((s) => s.tarjetas);

  // La «pila» se fija al entrar (ids), así calificar no la reordena sola. «Otra vez» la manda al final.
  const [ronda, setRonda] = useState<Ronda>(() => nuevaRonda(ids, practica));
  const [mostrada, setMostrada] = useState(false);

  const volver = rutaMazo(mazo.id);
  const idActual = ronda.pila[0];
  const actual = idActual ? tarjetas.find((c) => c.id === idActual) : undefined;

  const calificar = useCallback(
    (cal: Calificacion) => {
      if (!idActual) return;
      const repo = useRepasoStore.getState();
      // En práctica no se toca la programación: repasar antes de tiempo no debe alejar las tarjetas.
      if (!ronda.practica) repo.calificar(idActual, cal);
      repo.anotar(ronda.id, mazo.id, ronda.practica, idActual, cal);
      setRonda((r) => ({
        ...r,
        pila: cal === "otra" ? [...r.pila.slice(1), r.pila[0]!] : r.pila.slice(1),
        primera: r.primera[idActual] ? r.primera : { ...r.primera, [idActual]: cal },
        hechas: cal === "otra" ? r.hechas : r.hechas + 1,
      }));
      setMostrada(false);
    },
    [idActual, ronda.id, ronda.practica, mazo.id],
  );

  const empezar = (nuevas: string[], comoPractica: boolean) => {
    setRonda(nuevaRonda(nuevas, comoPractica));
    setMostrada(false);
  };

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
  const costaron = ronda.inicial.filter((id) => ronda.primera[id] === "otra");
  const vistas = Object.keys(ronda.primera).length;
  const siguiente = proximoRepaso(tarjetas, mazo.id);
  const total = ronda.hechas + ronda.pila.length;

  /** Lo que pasará con la tarjeta según el botón, dicho antes de pulsarlo. */
  const efecto = (cal: Calificacion): string => {
    if (cal === "otra") return t("vuelve en esta ronda");
    if (ronda.practica || !actual) return cal === "bien" ? t("me la sé") : t("sin dudar");
    return t("vuelve {cuando}", { cuando: cuandoToca(programar(actual, cal).vence) });
  };

  const BOTONES: { cal: Calificacion; tecla: string; texto: string }[] = [
    { cal: "otra", tecla: "1", texto: t("No me la sabía") },
    { cal: "bien", tecla: "2", texto: t("Bien") },
    { cal: "facil", tecla: "3", texto: t("Fácil") },
  ];

  return (
    <PlantillaPagina
      migas={[{ etiqueta: t("Repaso"), href: "/repaso" }, { etiqueta: mazo.nombre, href: volver }, { etiqueta: ronda.practica ? t("Practicar") : t("Estudiar") }]}
      titulo={mazo.nombre}
      descripcion={terminado ? t("Sesión terminada") : t("Tarjeta {n} de {total}", { n: ronda.hechas + 1, total })}
      principal={
        terminado ? (
          <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-10 text-center">
            <Glifo nombre="exito" tam={48} />
            <h2 className="text-title text-fg">{vistas === 0 ? t("No hay tarjetas para repasar") : ronda.practica ? t("¡Práctica terminada!") : t("¡Listo por hoy!")}</h2>
            {vistas > 0 && (
              <>
                <div className="grid w-full grid-cols-3 gap-2">
                  <Dato valor={vistas} etiqueta={t("repasadas")} />
                  <Dato valor={vistas - costaron.length} etiqueta={t("a la primera")} />
                  <Dato valor={costaron.length} etiqueta={t("te costaron")} />
                </div>
                <p className="text-body text-fg-secondary">
                  {ronda.practica ? t("Fue práctica: no cambió cuándo te toca cada tarjeta.") : siguiente ? t("Tu próximo repaso de este mazo toca {cuando}.", { cuando: cuandoToca(siguiente) }) : t("Nexo te las volverá a mostrar cuando toque.")}
                </p>
              </>
            )}
            <div className="flex w-full flex-col gap-2">
              {costaron.length > 0 && (
                <Button variant="accent" className="h-10" onClick={() => empezar(costaron, true)}>
                  {t("Repasar las que me costaron ({n})", { n: costaron.length })}
                </Button>
              )}
              {vistas > 0 && (
                <Button className="h-10" onClick={() => empezar(ronda.inicial, true)}>
                  {t("Repetir esta ronda")}
                </Button>
              )}
              <Button variant="subtle" className="self-center" onClick={() => router.push(volver)}>
                {t("Volver al mazo")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[640px] flex-col items-stretch gap-4">
            {ronda.practica && (
              <InfoBar severity="info" title={t("Modo práctica")}>
                {t("Puedes repetir las veces que quieras: no cambia cuándo te toca cada tarjeta.")}
              </InfoBar>
            )}
            <div className="h-1 overflow-hidden rounded-full bg-layer-alt">
              <div className="h-full rounded-full bg-accent transition-[width] duration-exit" style={{ width: `${(ronda.hechas / Math.max(1, total)) * 100}%` }} />
            </div>

            <button
              type="button"
              onClick={() => setMostrada(true)}
              aria-label={mostrada ? undefined : t("Mostrar respuesta")}
              className={clsx("flex min-h-[260px] w-full flex-col rounded-card border border-stroke bg-layer p-6 text-left shadow-card", !mostrada && "cursor-pointer transition-colors duration-exit ease-fluent hover:bg-layer-alt")}
            >
              <span className="text-caption text-fg-tertiary">{t("Pregunta")}</span>
              <span className="mt-1 block whitespace-pre-wrap text-title text-fg">{actual.frente}</span>
              {mostrada ? (
                <span className="mt-4 block border-t border-stroke pt-4">
                  <span className="block text-caption text-fg-tertiary">{t("Respuesta")}</span>
                  <span className="mt-1 block whitespace-pre-wrap text-subtitle text-fg-secondary">{actual.reverso}</span>
                </span>
              ) : (
                <span className="mt-auto block pt-6 text-center text-caption text-fg-tertiary">{t("Piensa tu respuesta y toca la tarjeta para voltearla")}</span>
              )}
            </button>

            {!mostrada ? (
              <Button variant="accent" className="h-11" onClick={() => setMostrada(true)}>
                {t("Mostrar respuesta")} <Kbd>{t("Espacio")}</Kbd>
              </Button>
            ) : (
              <>
                <p className="text-center text-caption text-fg-secondary">{t("¿Qué tan bien te la sabías?")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {BOTONES.map((b) => (
                    <Button key={b.cal} variant={b.cal === "facil" ? "accent" : undefined} className="!h-auto min-h-14 flex-col !gap-0.5 py-2" onClick={() => calificar(b.cal)}>
                      <span className="flex items-center gap-2 font-semibold">
                        {b.texto} <Kbd>{b.tecla}</Kbd>
                      </span>
                      <span className="text-caption opacity-80">{efecto(b.cal)}</span>
                    </Button>
                  ))}
                </div>
              </>
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

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-card border border-stroke bg-layer p-3">
      <p className="text-title text-fg">{valor}</p>
      <p className="text-caption text-fg-secondary">{etiqueta}</p>
    </div>
  );
}
