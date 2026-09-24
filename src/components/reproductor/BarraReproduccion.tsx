"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Glifo } from "@/components/fluent/Glifo";
import { Slider } from "@/components/fluent/Slider";
import type { NombreGlifo } from "@/lib/glifos";
import { formatDuration } from "@/lib/video/format";
import { useProgreso } from "@/hooks/useProgreso";
import { useAppStore } from "@/store/app-store";
import { useFavoritosStore } from "@/store/favoritos-store";
import { alternarMeGusta, esMeGusta } from "@/services/music/megusta";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { Marquesina } from "./Marquesina";

export const ALTO_BARRA_MUSICA = 72;

function Boton({
  nombre,
  etiqueta,
  onClick,
  activo,
  tam = 16,
  className,
}: {
  nombre: NombreGlifo;
  etiqueta: string;
  onClick: () => void;
  activo?: boolean;
  tam?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo === undefined ? undefined : activo}
      className={clsx(
        "rounded-control flex h-8 w-8 shrink-0 items-center justify-center transition-[background-color,color] duration-exit ease-fluent hover:bg-layer-alt active:bg-layer active:text-fg-secondary",
        activo ? "text-accent-text" : "text-fg",
        className,
      )}
    >
      <Glifo nombre={nombre} tam={tam} />
    </button>
  );
}

function Contenido() {
  const router = useRouter();
  const pista = useReproductorStore((s) => s.pista);
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);
  const capacidades = useReproductorStore((s) => s.capacidades);
  const cola = useReproductorStore((s) => s.cola);
  const aleatorio = useReproductorStore((s) => s.aleatorio);
  const repetir = useReproductorStore((s) => s.repetir);
  const volumen = useReproductorStore((s) => s.volumen);
  const error = useReproductorStore((s) => s.error);
  const colaAbierta = useAppStore((s) => s.colaMusicaAbierta);
  const progreso = useProgreso();
  const todosFavoritos = useFavoritosStore((s) => s.favoritos);
  const meGusta = useMusicStore((s) => s.meGusta);
  const favorito = pista ? esMeGusta(pista, todosFavoritos, meGusta) : false;
  const st = useReproductorStore.getState;

  if (!pista) return null;
  // Con una cola de varias pistas, NexusHub mismo puede saltar entre ellas aunque la fuente no lo haga.
  const puedeSaltar = capacidades.saltar || cola.length > 1;
  const duracion = pista.duracion;

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)_240px] items-center gap-4 px-4">
      {/* Izquierda: carátula, título y artista — abre la vista grande "Reproduciendo ahora" */}
      <button
        type="button"
        onClick={() => useAppStore.getState().setReproductorGrandeAbierto(true)}
        aria-label={`Abrir la vista grande de «${pista.titulo}»`}
        className="rounded-control flex min-w-0 items-center gap-3 py-1 pl-1 pr-2 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt"
      >
        {pista.caratula ? (
          // eslint-disable-next-line @next/next/no-img-element -- carátula remota
          <img src={pista.caratula} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-[4px] object-cover shadow-card" draggable={false} />
        ) : (
          <span className="h-12 w-12 shrink-0 rounded-[4px] bg-layer-alt" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <Marquesina texto={pista.titulo} className="text-body font-semibold text-fg" />
          <p className="truncate text-caption text-fg-secondary" title={error ?? pista.artista}>
            {error ? <span className="text-critical-fg">{error}</span> : pista.artista}
          </p>
        </div>
      </button>

      {/* Centro: controles y progreso */}
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-0.5">
        <div className="flex items-center gap-1">
          {puedeSaltar && <Boton nombre="anterior" etiqueta="Anterior" onClick={() => st().anterior()} />}
          <button
            type="button"
            onClick={() => st().alternar()}
            aria-label={reproduciendo ? "Pausar" : "Reproducir"}
            title={reproduciendo ? "Pausar" : "Reproducir"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on transition-colors duration-exit ease-fluent hover:bg-accent-hover active:bg-accent-pressed"
          >
            <Glifo nombre={reproduciendo ? "pausar" : "reproducir"} tam={16} />
          </button>
          {puedeSaltar && <Boton nombre="siguiente" etiqueta="Siguiente" onClick={() => st().siguiente()} />}
        </div>
        <div className="flex w-full items-center gap-2 text-caption text-fg-secondary">
          <span className="tabular w-10 text-right">{formatDuration(progreso)}</span>
          <div className="min-w-0 flex-1">
            <Slider
              label="Posición de la canción"
              value={Math.min(progreso, duracion || progreso)}
              max={Math.max(duracion, 1)}
              disabled={!capacidades.buscar || duracion <= 0}
              valueText={`${formatDuration(progreso)} de ${formatDuration(duracion)}`}
              onCommit={(v) => st().buscar(v)}
            />
          </div>
          <span className="tabular w-10">{duracion > 0 ? formatDuration(duracion) : "--:--"}</span>
        </div>
      </div>

      {/* Derecha: aleatorio, repetir, volumen, expandir (solo lo que la fuente activa puede cumplir) */}
      <div className="flex items-center justify-end gap-0.5">
        {capacidades.aleatorio && <Boton nombre="aleatorio" etiqueta="Aleatorio" activo={aleatorio} onClick={() => st().setAleatorio(!aleatorio)} />}
        {capacidades.repetir && (
          <Boton
            nombre={repetir === "una" ? "repetirUna" : "repetir"}
            etiqueta={repetir === "no" ? "Repetir: desactivado" : repetir === "una" ? "Repetir: una canción" : "Repetir: todas"}
            activo={repetir !== "no"}
            onClick={() => st().setRepetir(repetir === "no" ? "todas" : repetir === "todas" ? "una" : "no")}
          />
        )}
        <Boton nombre="lista" etiqueta="Cola de reproducción" activo={colaAbierta} onClick={() => useAppStore.getState().setColaMusicaAbierta(!colaAbierta)} />
        {capacidades.volumen && (
          <div className="flex w-[84px] items-center">
            <Slider label="Volumen" value={volumen} max={100} valueText={`${Math.round(volumen)} %`} onCommit={(v) => st().setVolumen(v)} onChange={(v) => st().setVolumen(v)} />
          </div>
        )}
        <Boton
          nombre={favorito ? "favoritoLleno" : "favorito"}
          etiqueta={favorito ? "Quitar de Me gusta" : "Me gusta"}
          activo={favorito}
          onClick={() => void alternarMeGusta(pista)}
        />
        <Boton nombre="expandir" etiqueta="Abrir Música" onClick={() => router.push("/musica")} />
      </div>
    </div>
  );
}

/**
 * Barra de música de 72 px, pegada abajo (encima de la barra de estado). Acrílico, borde superior. Aparece
 * deslizándose hacia arriba UNA vez; el contenido de la ventana se encoge para dejarle sitio.
 */
export function BarraReproduccion() {
  const visible = useReproductorStore((s) => s.fuente === "spotify" && s.pista !== null);
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="barra-musica"
          role="region"
          aria-label="Reproductor de música"
          initial={{ height: 0 }}
          animate={{ height: ALTO_BARRA_MUSICA }}
          exit={{ height: 0 }}
          transition={{ duration: 0.25, ease: [0, 0, 0, 1] }}
          className="acrylic shrink-0 overflow-hidden !border-x-0 !border-b-0 !border-t border-t-stroke"
        >
          <div style={{ height: ALTO_BARRA_MUSICA }}>
            <Contenido />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
