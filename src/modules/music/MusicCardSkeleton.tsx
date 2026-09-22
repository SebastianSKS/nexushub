/** Esqueleto con la forma de MusicCard: carátula cuadrada, título y artista. */
export function MusicCardSkeleton() {
  return (
    <div className="rounded-control border border-stroke bg-layer p-3" aria-hidden>
      <div className="skeleton aspect-square w-full" />
      <div className="skeleton mt-3 h-4 w-4/5" />
      <div className="skeleton mt-2 h-3 w-1/2" />
    </div>
  );
}
