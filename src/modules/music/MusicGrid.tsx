"use client";

import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { pistaDeItem } from "@/services/music/lista";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { MusicCard } from "./MusicCard";
import { MusicCardSkeleton } from "./MusicCardSkeleton";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

/** Cuadrícula de música con sus estados: cargando (esqueletos), error, vacío y listo. */
export function MusicGrid() {
  const status = useMusicStore((s) => s.status);
  const items = useMusicStore((s) => s.items);
  const heading = useMusicStore((s) => s.heading);
  const error = useMusicStore((s) => s.error);
  const query = useMusicStore((s) => s.query);
  const currentId = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));
  const { load } = useMusicStore.getState();
  const reproducir = (i: number) => {
    // Las canciones visibles forman la cola: siguiente pasa a la canción de al lado.
    const canciones = items.filter((x) => x.kind === "track").map(pistaDeItem);
    const pista = pistaDeItem(items[i]!);
    useReproductorStore.getState().reproducir(pista, canciones.length > 0 ? canciones : [pista]);
  };

  if (status === "idle" || (status === "loading" && items.length === 0)) {
    return (
      <div className={GRID} role="status" aria-label="Cargando música">
        {Array.from({ length: 12 }, (_, i) => (
          <MusicCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6" role="alert">
        <h2 className="text-subtitle text-fg">{error.message}</h2>
        {error.hint && <p className="text-body text-fg-secondary">{error.hint}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={() => void load(query)}>
            Reintentar
          </Button>
          <Button onClick={() => void load("")}>Ver sugeridos</Button>
        </div>
      </Card>
    );
  }

  return (
    <section aria-labelledby="music-results-heading" aria-busy={status === "loading"}>
      <h2 id="music-results-heading" className="mb-3 text-subtitle text-fg">
        {heading}
      </h2>
      {items.length === 0 ? (
        <Card className="p-6">
          <p className="text-body text-fg">No hay sugeridos que coincidan con «{query}».</p>
          <p className="mt-1 text-body text-fg-secondary">
            Prueba con otra palabra, o abre Spotify, pulsa Compartir → Copiar enlace de la canción y pégalo en el buscador.
          </p>
          <Button className="mt-4" onClick={() => void load("")}>
            Ver sugeridos
          </Button>
        </Card>
      ) : (
        <div className={GRID}>
          {items.map((item, i) => (
            <MusicCard key={`${item.kind}:${item.id}`} item={item} active={currentId === `${item.kind}:${item.id}`} onPlay={() => reproducir(i)} />
          ))}
        </div>
      )}
    </section>
  );
}
