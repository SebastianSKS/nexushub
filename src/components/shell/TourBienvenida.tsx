"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { NexusMark } from "@/components/shell/NexusMark";
import type { NombreGlifo } from "@/lib/glifos";
import { ENTER, EXIT } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";

export const CLAVE_TOUR_VISTO = "nexushub-tour-visto";

interface Paso {
  glifo: NombreGlifo;
  titulo: string;
  texto: string;
}

const PASOS: Paso[] = [
  {
    glifo: "informacion",
    titulo: "Bienvenido a NexusHub",
    texto: "Video, Música, Documentos y Calendario, los cuatro en una sola ventana. Este recorrido dura medio minuto — «Omitir» lo salta en cualquier momento.",
  },
  {
    glifo: "video",
    titulo: "Video",
    texto: "Sigue tus canales favoritos de YouTube y mira sus novedades en un muro que se arma solo, sin anuncios de por medio.",
  },
  {
    glifo: "musica",
    titulo: "Música",
    texto: "Escucha Spotify sin salir de NexusHub: como invitado, o conectando tu cuenta. Guarda tus canciones favoritas y retoma lo que sonó hace rato.",
  },
  {
    glifo: "documentos",
    titulo: "Documentos",
    texto: "Convierte y edita PDF, Word, Excel y PowerPoint arrastrándolos a la ventana. Todo pasa dentro de tu equipo: nada se sube a ningún servidor.",
  },
  {
    glifo: "calendario",
    titulo: "Calendario",
    texto: "Cumpleaños de tus amigos y tus propios eventos (hasta los que se repiten cada semana o cada mes), con avisos para que no se te pase ninguno.",
  },
];

/** Recorrido de bienvenida: 5 pantallas cortas, una por sección. Se marca como visto al cerrarlo. */
export function TourBienvenida() {
  const abierto = useAppStore((s) => s.tourAbierto);
  const [paso, setPaso] = useState(0);
  const ultimo = paso === PASOS.length - 1;

  const cerrar = () => {
    try {
      window.localStorage.setItem(CLAVE_TOUR_VISTO, "1");
    } catch {
      /* modo incógnito: se volverá a mostrar la próxima vez, sin mayor problema */
    }
    useAppStore.getState().setTourAbierto(false);
    setPaso(0);
  };

  const p = PASOS[paso]!;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Recorrido de bienvenida"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: ENTER }}
          exit={{ opacity: 0, transition: EXIT }}
          className="fixed inset-0 z-[65] flex items-center justify-center p-6"
          style={{ backgroundColor: "var(--scrim)" }}
          onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: ENTER }}
            exit={{ opacity: 0, y: 6, transition: EXIT }}
            className="acrylic flex w-full max-w-[440px] flex-col items-center gap-5 rounded-[8px] p-7 text-center shadow-dialog"
          >
            <div className="flex w-full items-center justify-between">
              <NexusMark size={18} />
              <IconButton label="Omitir el recorrido" onClick={cerrar} className="-mr-2">
                <Glifo nombre="cerrar" tam={12} />
              </IconButton>
            </div>

            <span className="flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd, #3fb6f5)" }} aria-hidden>
              <Glifo nombre={p.glifo} tam={28} />
            </span>

            <div>
              <h2 className="text-subtitle text-fg">{p.titulo}</h2>
              <p className="mt-2 text-body text-fg-secondary">{p.texto}</p>
            </div>

            <div className="flex items-center gap-1.5" role="tablist" aria-label="Paso">
              {PASOS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === paso}
                  aria-label={`Paso ${i + 1} de ${PASOS.length}`}
                  onClick={() => setPaso(i)}
                  className={clsx("h-1.5 rounded-full transition-[width,background-color] duration-exit ease-fluent", i === paso ? "w-5 bg-accent" : "w-1.5 bg-stroke-strong hover:bg-fg-tertiary")}
                />
              ))}
            </div>

            <div className="flex w-full items-center justify-between gap-2">
              <Button variant="subtle" onClick={cerrar}>
                Omitir
              </Button>
              <div className="flex gap-2">
                {paso > 0 && <Button onClick={() => setPaso((x) => x - 1)}>Atrás</Button>}
                <Button variant="accent" onClick={() => (ultimo ? cerrar() : setPaso((x) => x + 1))}>
                  {ultimo ? "Empezar" : "Siguiente"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
