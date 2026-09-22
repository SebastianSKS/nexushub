"use client";

import { Reorder } from "framer-motion";
import { Delete20Regular, Play20Regular, ReOrderDotsVertical20Regular } from "@fluentui/react-icons";
import clsx from "clsx";
import { Card } from "@/components/fluent/Card";
import { IconButton } from "@/components/fluent/IconButton";
import { formatDuration } from "@/lib/video/format";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

function FilaCola({ pista, indice, actual }: { pista: Pista; indice: number; actual: boolean }) {
  const { irAIndice, quitarDeCola } = useReproductorStore.getState();
  return (
    <div
      className={clsx(
        "rounded-control flex cursor-grab items-center gap-2 border bg-layer p-2 active:cursor-grabbing",
        actual ? "border-accent" : "border-stroke",
      )}
    >
      <span className="flex shrink-0 text-fg-tertiary" aria-hidden>
        <ReOrderDotsVertical20Regular />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota de YouTube */}
      <img src={pista.caratula} alt="" draggable={false} className="aspect-video h-9 shrink-0 rounded-[4px] object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg" title={pista.titulo}>
          {pista.titulo}
        </p>
        <p className="tabular truncate text-caption text-fg-secondary">
          {actual ? "Reproduciendo · " : ""}
          {pista.artista}
          {pista.duracion > 0 && ` · ${formatDuration(pista.duracion)}`}
        </p>
      </div>
      {!actual && (
        <>
          <IconButton label={`Reproducir ahora: ${pista.titulo}`} onClick={() => irAIndice(indice)} className="h-7 w-7">
            <Play20Regular />
          </IconButton>
          <IconButton label={`Quitar de la cola: ${pista.titulo}`} onClick={() => quitarDeCola(indice)} className="h-7 w-7">
            <Delete20Regular />
          </IconButton>
        </>
      )}
    </div>
  );
}

/** Cola de reproducción de video: se reordena arrastrando y avanza sola al terminar cada video. */
export function ColaVideos() {
  const cola = useReproductorStore((s) => s.cola);
  const idxActual = useReproductorStore((s) => s.indiceActual);
  const reordenarCola = useReproductorStore((s) => s.reordenarCola);

  return (
    <Card className="flex min-h-0 flex-col p-3">
      <h2 className="mb-2 px-1 text-body font-semibold text-fg">
        Cola de reproducción <span className="tabular font-normal text-fg-secondary">({cola.length})</span>
      </h2>
      {cola.length <= 1 ? (
        <p className="px-1 py-3 text-body text-fg-secondary">
          Aquí aparece lo que sigue. Usa «+» en cualquier video para añadirlo; al terminar, pasa solo al siguiente.
        </p>
      ) : (
        <Reorder.Group axis="y" values={cola} onReorder={reordenarCola} aria-label="Cola de reproducción, arrastra para reordenar" className="flex max-h-[60vh] min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
          {cola.map((p, i) => (
            <Reorder.Item key={`${p.fuente}:${p.id}`} value={p} className="list-none" whileDrag={{ scale: 1.01, zIndex: 10 }}>
              <FilaCola pista={p} indice={i} actual={i === idxActual} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </Card>
  );
}
