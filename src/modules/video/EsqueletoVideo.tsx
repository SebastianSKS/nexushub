/** Esqueleto con la misma forma que TarjetaVideo: miniatura 16:9, dos líneas de título y una de canal. */
export function EsqueletoVideo() {
  return (
    <div className="rounded-control border border-stroke bg-layer p-2" aria-hidden>
      <div className="skeleton aspect-video w-full rounded-control" />
      <div className="px-1 pb-1 pt-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton mt-1.5 h-4 w-3/4" />
        <div className="skeleton mt-3 h-3 w-1/2" />
      </div>
    </div>
  );
}
