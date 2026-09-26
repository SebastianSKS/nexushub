"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/fluent/Button";
import { PistaCard } from "@/components/reproductor/PistaCard";
import { alternarMeGusta } from "@/services/music/megusta";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

function Fila({ titulo, pistas, accion }: { titulo: string; pistas: Pista[]; accion?: React.ReactNode }) {
  const t = useT();
  const currentId = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));
  const favoritos = useFavoritosStore((s) => s.favoritos);
  const esFavorito = (p: Pista) => favoritos.some((f) => f.id === p.id && f.fuente === p.fuente);

  return (
    <section aria-label={t(titulo)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-subtitle text-fg">{t(titulo)}</h2>
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
            onAlternarFavorito={() => void alternarMeGusta(p)}
          />
        ))}
      </div>
    </section>
  );
}

/** Favoritos y reproducido recientemente de Spotify: solo se muestran cuando hay algo que enseñar. */
export function FavoritosRecientes() {
  const t = useT();
  // El filtro NO va dentro del selector: .filter() devuelve un array nuevo en cada lectura y eso
  // rompe useSyncExternalStore (bucle infinito). Se leen los arrays estables y se filtran aparte, memoizados.
  const todosFavoritos = useFavoritosStore((s) => s.favoritos);
  const todosRecientes = useFavoritosStore((s) => s.recientes);
  const favoritos = useMemo(() => todosFavoritos.filter((p) => p.fuente === "spotify"), [todosFavoritos]);
  const recientes = useMemo(() => todosRecientes.filter((p) => p.fuente === "spotify"), [todosRecientes]);

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
              {t("Borrar historial")}
            </Button>
          }
        />
      )}
    </div>
  );
}
