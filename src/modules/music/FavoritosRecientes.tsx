"use client";

import { useEffect } from "react";
import { Button } from "@/components/fluent/Button";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";
import { PistaCard } from "./PistaCard";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

function Fila({ titulo, pistas, accion }: { titulo: string; pistas: Pista[]; accion?: React.ReactNode }) {
  const currentId = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));
  const favoritos = useFavoritosStore((s) => s.favoritos);
  const esFavorito = (p: Pista) => favoritos.some((f) => f.id === p.id && f.fuente === p.fuente);

  return (
    <section aria-label={titulo}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-subtitle text-fg">{titulo}</h2>
        {accion}
      </div>
      <div className={GRID}>
        {pistas.map((p) => (
          <PistaCard
            key={`${p.fuente}:${p.id}`}
            pista={p}
            active={currentId === p.id}
            favorito={esFavorito(p)}
            onPlay={() => useReproductorStore.getState().reproducir(p, pistas)}
            onAlternarFavorito={() => useFavoritosStore.getState().alternarFavorito(p)}
          />
        ))}
      </div>
    </section>
  );
}

/** Favoritos y reproducido recientemente: solo se muestran cuando hay algo que enseñar. */
export function FavoritosRecientes() {
  const favoritos = useFavoritosStore((s) => s.favoritos);
  const recientes = useFavoritosStore((s) => s.recientes);

  useEffect(() => useFavoritosStore.getState().cargar(), []);

  if (favoritos.length === 0 && recientes.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {favoritos.length > 0 && <Fila titulo="Favoritos" pistas={favoritos} />}
      {recientes.length > 0 && (
        <Fila
          titulo="Reproducido recientemente"
          pistas={recientes}
          accion={
            <Button variant="subtle" onClick={() => useFavoritosStore.getState().limpiarRecientes()}>
              Borrar historial
            </Button>
          }
        />
      )}
    </div>
  );
}
