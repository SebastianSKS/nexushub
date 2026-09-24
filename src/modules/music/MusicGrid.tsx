"use client";

import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { pistaDeItem } from "@/services/music/lista";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { MusicCard } from "./MusicCard";
import { MusicCardSkeleton } from "./MusicCardSkeleton";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

/** Cuadrícula de música por renglones, con sus estados: cargando (esqueletos), error, vacío y listo. */
export function MusicGrid() {
  const status = useMusicStore((s) => s.status);
  const secciones = useMusicStore((s) => s.secciones);
  const error = useMusicStore((s) => s.error);
  const query = useMusicStore((s) => s.query);
  const currentId = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));
  const { load } = useMusicStore.getState();

  const reproducir = (renglon: number, i: number) => {
    // Como en Spotify: se reproduce la canción elegida y la música sigue sola con canciones parecidas (la radio).
    useReproductorStore.getState().reproducir(pistaDeItem(secciones[renglon]!.items[i]!));
  };

  if (status === "idle" || (status === "loading" && secciones.length === 0)) {
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

  if (secciones.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-body text-fg">No encontré nada para «{query}».</p>
        <p className="mt-1 text-body text-fg-secondary">Prueba con otra palabra, o abre Spotify, pulsa Compartir → Copiar enlace de la canción y pégalo en el buscador.</p>
        <Button className="mt-4" onClick={() => void load("")}>
          Ver sugeridos
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8" aria-busy={status === "loading"}>
      {secciones.map((s, r) => (
        <section key={s.titulo} aria-label={s.titulo}>
          <h2 className="mb-3 text-subtitle text-fg">{s.titulo}</h2>
          <div className={GRID}>
            {s.items.map((item, i) => (
              <MusicCard key={`${item.kind}:${item.id}`} item={item} active={currentId === `${item.kind}:${item.id}`} onPlay={() => reproducir(r, i)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
