"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { pistaDeVideo } from "@/lib/canales/pistas";
import { rutaVer } from "@/lib/rutas";
import { normalize } from "@/lib/text";
import { estaIncrustable, useCanalesStore } from "@/store/canales-store";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useReproductorStore } from "@/store/reproductor-store";
import type { VideoCanal } from "@/types/canal";
import { EsqueletoVideo } from "./EsqueletoVideo";
import { TarjetaVideo } from "./TarjetaVideo";

const CUADRICULA = "grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4";

/** Une los videos de los canales indicados, sin repetidos, del más reciente al más antiguo. */
function combinar(ids: string[], feeds: Record<string, { videos: VideoCanal[] }>): VideoCanal[] {
  const unicos = new Map<string, VideoCanal>();
  for (const id of ids) for (const v of feeds[id]?.videos ?? []) if (!unicos.has(v.videoId)) unicos.set(v.videoId, v);
  return [...unicos.values()].sort((a, b) => Date.parse(b.publicado) - Date.parse(a.publicado));
}

/** Filtra en vivo por título y nombre del canal (sin distinguir acentos ni mayúsculas). */
function filtrar(videos: VideoCanal[], consulta: string): VideoCanal[] {
  const terminos = normalize(consulta).split(/\s+/).filter(Boolean);
  if (terminos.length === 0) return videos;
  return videos.filter((v) => {
    const texto = normalize(`${v.titulo} ${v.canalNombre}`);
    return terminos.every((t) => texto.includes(t));
  });
}

/** Muro de videos de los canales indicados (todos = Novedades). Al pulsar uno se abre /video/ver?id=. */
export function MuroVideos({ ids, titulo }: { ids: string[]; titulo: string }) {
  const router = useRouter();
  const canales = useCanalesStore((s) => s.canales);
  const feeds = useCanalesStore((s) => s.feeds);
  const busqueda = useCanalesStore((s) => s.busqueda);
  const verificacion = useCanalesStore((s) => s.verificacion);
  const duraciones = useCanalesStore((s) => s.duraciones);
  const iniciado = useCanalesStore((s) => s.iniciado);
  const actualId = useReproductorStore((s) => (s.fuente === "youtube" ? s.pista?.id : undefined));
  const cola = useReproductorStore((s) => s.cola);
  const favoritos = useFavoritosStore((s) => s.favoritos);
  const { cargarFeed, restaurarSugeridos } = useCanalesStore.getState();

  useEffect(() => useFavoritosStore.getState().cargar(), []);

  const todos = useMemo(() => combinar(ids, feeds), [ids.join(","), feeds]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibles = useMemo(() => filtrar(todos, busqueda), [todos, busqueda]);

  const errores = ids.map((id) => ({ id, feed: feeds[id] })).filter((x) => x.feed?.estado === "error");
  const cargando = ids.some((id) => feeds[id]?.estado === "cargando" || feeds[id] === undefined);

  const reproducir = (video: VideoCanal) => {
    const lista = visibles.filter((v) => (estaIncrustable(v, verificacion).incrustable !== false));
    useReproductorStore.getState().reproducir(pistaDeVideo(video, duraciones), lista.map((v) => pistaDeVideo(v, duraciones)));
    router.push(rutaVer(video.videoId));
  };
  const encolar = (video: VideoCanal) => useReproductorStore.getState().encolar(pistaDeVideo(video, duraciones));
  const esFavorito = (video: VideoCanal) => favoritos.some((f) => f.id === video.videoId && f.fuente === "youtube");
  const alternarFavorito = (video: VideoCanal) => useFavoritosStore.getState().alternarFavorito(pistaDeVideo(video, duraciones));

  if (iniciado && canales.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6">
        <h2 className="text-subtitle text-fg">Aún no sigues ningún canal</h2>
        <p className="text-body text-fg-secondary">Usa «Agregar canal» (arriba a la derecha) y pega el enlace de un canal de YouTube, o recupera los canales sugeridos.</p>
        <Button onClick={restaurarSugeridos}>Restaurar canales sugeridos</Button>
      </Card>
    );
  }

  return (
    <section aria-labelledby="muro-titulo" aria-busy={cargando}>
      <h2 id="muro-titulo" className="mb-3 text-subtitle text-fg">
        {titulo}
        {busqueda.trim() && <span className="ml-2 text-body font-normal text-fg-secondary">· filtrando por «{busqueda.trim()}»</span>}
      </h2>

      {errores.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {errores.slice(0, 3).map(({ id, feed }) => {
            const nombre = canales.find((c) => c.id === id)?.nombre ?? "canal";
            return (
              <InfoBar
                key={id}
                severity="warning"
                title={`No se pudo actualizar «${nombre}».`}
                action={
                  <Button className="h-7" onClick={() => void cargarFeed(id, { fresco: true })}>
                    Reintentar
                  </Button>
                }
              >
                {feed?.error?.mensaje} {feed?.error?.pista}
                {feed && feed.videos.length > 0 && " Se muestran los videos que ya estaban cargados."}
              </InfoBar>
            );
          })}
          {errores.length > 3 && <p className="text-caption text-fg-secondary">Y otros {errores.length - 3} canales con el mismo problema.</p>}
        </div>
      )}

      {visibles.length === 0 ? (
        cargando ? (
          <div className={CUADRICULA} role="status" aria-label="Cargando videos">
            {Array.from({ length: 12 }, (_, i) => (
              <EsqueletoVideo key={i} />
            ))}
          </div>
        ) : busqueda.trim() ? (
          <Card className="p-6">
            <p className="text-body text-fg">No hay videos que coincidan con «{busqueda.trim()}».</p>
            <p className="mt-1 text-body text-fg-secondary">Esta búsqueda solo mira los videos ya cargados de tus canales. Prueba con otra palabra o agrega más canales.</p>
            <Button className="mt-4" onClick={() => useCanalesStore.getState().setBusqueda("")}>
              Borrar búsqueda
            </Button>
          </Card>
        ) : errores.length > 0 ? null : (
          <Card className="p-6">
            <p className="text-body text-fg">{ids.length === 1 ? "Este canal no tiene videos publicados todavía." : "Tus canales no tienen videos publicados todavía."}</p>
            <p className="mt-1 text-body text-fg-secondary">Cuando publiquen algo aparecerá aquí.</p>
          </Card>
        )
      ) : (
        <div className={CUADRICULA}>
          {visibles.map((video) => {
            const inc = estaIncrustable(video, verificacion);
            return (
              <TarjetaVideo
                key={video.videoId}
                video={video}
                activo={actualId === video.videoId}
                enCola={actualId === video.videoId || cola.some((p) => p.id === video.videoId)}
                incrustable={inc.incrustable}
                favorito={esFavorito(video)}
                duracion={duraciones[video.videoId] ?? null}
                onReproducir={() => reproducir(video)}
                onEncolar={() => encolar(video)}
                onAlternarFavorito={() => alternarFavorito(video)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
