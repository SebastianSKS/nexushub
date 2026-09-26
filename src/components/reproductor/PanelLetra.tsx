"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useProgreso } from "@/hooks/useProgreso";
import { cargarLetra, lineaActual, type Letra } from "@/services/music/letras";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

/** Letra de la canción que suena: si viene con tiempos, se marca la línea actual y se puede pulsar una para saltar a ella. */
export function PanelLetra({ pista }: { pista: Pista }) {
  const tr = useT();
  const [estado, setEstado] = useState<{ id: string; letra: Letra | null | "error" } | "cargando">("cargando");
  const progreso = useProgreso();
  const contenedor = useRef<HTMLDivElement>(null);
  const manualHasta = useRef(0);

  useEffect(() => {
    let cancelado = false;
    setEstado("cargando");
    void cargarLetra(pista).then((letra) => !cancelado && setEstado({ id: pista.id, letra }));
    return () => {
      cancelado = true;
    };
    // La duración llega un momento después en algunas canciones: no hace falta volver a pedir la letra por eso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pista.id]);

  const letra = estado !== "cargando" && estado.id === pista.id ? estado.letra : "cargando";
  const lineas = letra !== "cargando" && letra !== "error" && letra ? letra.sincronizada : null;
  const actual = lineas ? lineaActual(lineas, progreso + 0.25) : -1;

  // La línea que suena se mantiene en el centro, salvo que la persona esté moviendo la letra a mano.
  useEffect(() => {
    if (actual < 0 || Date.now() < manualHasta.current) return;
    const el = contenedor.current?.querySelector<HTMLElement>(`[data-linea="${actual}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [actual]);

  const centrado = "flex h-full items-center justify-center text-center text-body text-white/60";
  if (letra === "cargando") return <div className={centrado} role="status">{tr("Buscando la letra…")}</div>;
  if (letra === "error") return <div className={centrado} role="status">{tr("No se pudo buscar la letra. Comprueba tu conexión a internet.")}</div>;
  if (!letra || (!letra.sincronizada && !letra.plana)) return <div className={centrado} role="status">{tr("No encontramos la letra de esta canción.")}</div>;

  return (
    <div
      ref={contenedor}
      tabIndex={0}
      aria-label={tr("Letra de la canción")}
      onWheel={() => (manualHasta.current = Date.now() + 4000)}
      onTouchMove={() => (manualHasta.current = Date.now() + 4000)}
      className="h-full overflow-y-auto px-2 py-[30vh] text-left [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] focus-visible:outline-none"
    >
      {lineas ? (
        <ul className="flex flex-col gap-4">
          {lineas.map((l, i) => (
            <li key={i} data-linea={i}>
              <button
                type="button"
                disabled={!l.texto}
                onClick={() => useReproductorStore.getState().buscar(l.t)}
                className="block w-full text-left"
              >
                {/* El color va en el texto de dentro: el botón trae el suyo y lo taparía. */}
                <span
                  className={clsx(
                    "block text-[26px] font-bold leading-tight transition-[color] duration-enter ease-fluent",
                    i === actual ? "text-white" : i < actual ? "text-white/35 hover:text-white/60" : "text-white/45 hover:text-white/70",
                  )}
                >
                  {l.texto || "♪"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-line text-[22px] font-semibold leading-relaxed text-white/85">{letra.plana}</p>
      )}
    </div>
  );
}
