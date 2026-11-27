/** Esqueleto con la misma forma que TarjetaVideo: miniatura 16:9, foto del canal, dos líneas de título y una de canal. */
export function EsqueletoVideo() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-video w-full rounded-[10px]" />
      <div className="flex gap-2.5 pt-2.5">
        <div className="skeleton h-8 w-8 shrink-0 !rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton mt-1.5 h-4 w-3/4" />
          <div className="skeleton mt-2 h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}
