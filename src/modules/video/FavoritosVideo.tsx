"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PistaCard } from "@/components/reproductor/PistaCard";
import { rutaVer } from "@/lib/rutas";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useReproductorStore } from "@/store/reproductor-store";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

/** Tus videos favoritos: solo se muestra cuando hay alguno. */
export function FavoritosVideo() {
  const t = useT();
  const router = useRouter();
  // El filtro NO va dentro del selector: .filter() devuelve un array nuevo en cada lectura y eso
  // rompe useSyncExternalStore (bucle infinito). Se lee el array estable y se filtra aparte, memoizado.
  const todos = useFavoritosStore((s) => s.favoritos);
  const favoritos = useMemo(() => todos.filter((p) => p.fuente === "youtube"), [todos]);
  const actualId = useReproductorStore((s) => (s.fuente === "youtube" ? s.pista?.id : undefined));

  useEffect(() => useFavoritosStore.getState().cargar(), []);

  if (favoritos.length === 0) return null;

  return (
    <section aria-label={t("Favoritos")}>
      <h2 className="mb-3 text-subtitle text-fg">{t("Favoritos")}</h2>
      <div className={GRID}>
        {favoritos.map((p) => (
          <PistaCard
            key={p.id}
            pista={p}
            active={actualId === p.id}
            favorito
            onPlay={() => {
              useReproductorStore.getState().reproducir(p, favoritos);
              router.push(rutaVer(p.id));
            }}
            onAlternarFavorito={() => useFavoritosStore.getState().alternarFavorito(p)}
          />
        ))}
      </div>
    </section>
  );
}
