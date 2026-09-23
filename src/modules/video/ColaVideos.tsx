"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Add20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { Switch } from "@/components/fluent/Switch";
import { fechaRelativa } from "@/lib/canales/fecha";
import { pistaDeVideo } from "@/lib/canales/pistas";
import { rutaVer } from "@/lib/rutas";
import { formatDuration } from "@/lib/video/format";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCanalesStore } from "@/store/canales-store";
import { useProgresoVideoStore } from "@/store/progreso-video-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

interface Elemento {
  pista: Pista;
  /** Posición en la cola, o null si es una recomendación que aún no está en ella. */
  indice: number | null;
  publicado?: string;
}

/** Una tarjeta al estilo de la columna de YouTube: miniatura grande a la izquierda y el texto a la derecha. */
function Tarjeta({ el, actual, onAbrir, onAccion }: { el: Elemento; actual: boolean; onAbrir: () => void; onAccion: () => void }) {
  const { pista } = el;
  const visto = useProgresoVideoStore((s) => s.progreso[pista.id]);
  const meta = [pista.artista, el.publicado ? fechaRelativa(el.publicado) : ""].filter(Boolean).join(" · ");
  const enCola = el.indice !== null;

  return (
    <div className={clsx("group relative flex gap-2.5 rounded-control p-1.5 transition-colors duration-exit ease-fluent hover:bg-layer-alt", actual && "bg-layer-alt")}>
      <button type="button" onClick={onAbrir} aria-label={`Reproducir ${pista.titulo}, de ${pista.artista}`} aria-current={actual ? "true" : undefined} className="flex min-w-0 flex-1 gap-2.5 text-left">
        <span className="relative block aspect-video w-[152px] shrink-0 overflow-hidden rounded-[8px] bg-layer-alt">
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota de YouTube */}
          <img src={pista.caratula} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          {pista.duracion > 0 && (
            <span className="tabular absolute bottom-1 right-1 rounded-[4px] px-1 text-caption font-semibold text-white" style={{ backgroundColor: "rgba(0,0,0,0.78)" }}>
              {formatDuration(pista.duracion)}
            </span>
          )}
          {actual && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-caption font-semibold text-white" aria-hidden>
              Reproduciendo
            </span>
          )}
          {visto && !actual && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
              <span className="block h-full bg-[#ff0000]" style={{ width: `${Math.min(100, (visto.t / visto.d) * 100)}%` }} />
            </span>
          )}
        </span>
        <span className="min-w-0 pt-0.5">
          <span className="line-clamp-2 block text-body font-semibold leading-snug text-fg" title={pista.titulo}>
            {pista.titulo}
          </span>
          <span className="mt-1 block truncate text-caption text-fg-secondary" title={meta}>
            {meta}
          </span>
        </span>
      </button>
      {!actual && (
        <button
          type="button"
          onClick={onAccion}
          aria-label={enCola ? `Quitar de la cola: ${pista.titulo}` : `Añadir a la cola: ${pista.titulo}`}
          title={enCola ? "Quitar de la cola" : "Añadir a la cola"}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-layer text-fg opacity-0 shadow-card transition-opacity duration-exit ease-fluent hover:bg-layer-alt focus-visible:opacity-100 group-hover:opacity-100"
        >
          {enCola ? <Dismiss20Regular /> : <Add20Regular />}
        </button>
      )}
    </div>
  );
}

/**
 * La columna de la derecha, como la de YouTube: primero lo que sigue en la cola (con la reproducción
 * automática) y debajo más videos de tus canales para seguir viendo. Los chips filtran por canal.
 */
export function ColaVideos() {
  const router = useRouter();
  const cola = useReproductorStore((s) => s.cola);
  const idxActual = useReproductorStore((s) => s.indiceActual);
  const feeds = useCanalesStore((s) => s.feeds);
  const duraciones = useCanalesStore((s) => s.duraciones);
  const siguienteAuto = useAjustesStore((s) => s.siguienteAutomatico);
  const [soloCanal, setSoloCanal] = useState(false);

  const actual = idxActual >= 0 ? cola[idxActual] : undefined;
  const publicadoDe = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of Object.values(feeds)) for (const v of f.videos) m.set(v.videoId, v.publicado);
    return m;
  }, [feeds]);

  const { siguientes, recomendados } = useMemo(() => {
    // La cola, empezando por lo que sigue al actual (y dando la vuelta con lo que ya pasó).
    const orden = cola.length === 0 ? [] : [...cola.slice(idxActual + 1).map((p, k) => ({ p, i: idxActual + 1 + k })), ...cola.slice(0, Math.max(0, idxActual)).map((p, i) => ({ p, i }))];
    const enCola = new Set(cola.map((p) => p.id));
    const siguientes: Elemento[] = orden.filter((x) => !soloCanal || !actual || x.p.artista === actual.artista).map((x) => ({ pista: x.p, indice: x.i, publicado: publicadoDe.get(x.p.id) }));
    const recomendados: Elemento[] = Object.values(feeds)
      .flatMap((f) => f.videos)
      .filter((v) => !enCola.has(v.videoId) && (!soloCanal || !actual || v.canalNombre === actual.artista))
      .sort((a, b) => Date.parse(b.publicado) - Date.parse(a.publicado))
      .slice(0, 30)
      .map((v) => ({ pista: pistaDeVideo(v, duraciones), indice: null, publicado: v.publicado }));
    return { siguientes, recomendados };
  }, [cola, idxActual, feeds, duraciones, publicadoDe, soloCanal, actual]);

  const { irAIndice, quitarDeCola, encolar } = useReproductorStore.getState();
  const canal = actual?.artista;

  return (
    <section aria-label="Siguiente" className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-body font-semibold text-fg">Siguiente</h2>
        <label className="flex items-center gap-2 text-caption text-fg-secondary">
          Reproducción automática
          <Switch checked={siguienteAuto} onChange={(v) => useAjustesStore.getState().cambiar({ siguienteAutomatico: v })} label="Reproducir el siguiente video automáticamente" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 px-1" role="group" aria-label="Filtrar">
        {[
          { valor: false, texto: "Todo" },
          ...(canal ? [{ valor: true, texto: `De ${canal}` }] : []),
        ].map((c) => (
          <button
            key={c.texto}
            type="button"
            aria-pressed={soloCanal === c.valor}
            onClick={() => setSoloCanal(c.valor)}
            className={clsx("max-w-full truncate rounded-control h-8 px-3 text-body transition-colors duration-exit ease-fluent", soloCanal === c.valor ? "bg-fg text-mica" : "bg-layer-alt text-fg hover:bg-layer")}
          >
            {c.texto}
          </button>
        ))}
      </div>

      <div className="flex max-h-[calc(100vh-260px)] min-h-0 flex-col gap-0.5 overflow-y-auto pr-1">
        {actual && cola.length > 1 && !soloCanal && (
          <Tarjeta el={{ pista: actual, indice: idxActual, publicado: publicadoDe.get(actual.id) }} actual onAbrir={() => {}} onAccion={() => {}} />
        )}
        {siguientes.map((el) => (
          <Tarjeta key={`c-${el.pista.id}`} el={el} actual={false} onAbrir={() => irAIndice(el.indice!)} onAccion={() => quitarDeCola(el.indice!)} />
        ))}
        {recomendados.map((el) => (
          <Tarjeta key={`r-${el.pista.id}`} el={el} actual={false} onAbrir={() => router.push(rutaVer(el.pista.id))} onAccion={() => encolar(el.pista)} />
        ))}
        {siguientes.length === 0 && recomendados.length === 0 && <p className="px-1 py-3 text-body text-fg-secondary">No hay más videos que mostrar por ahora.</p>}
      </div>
    </section>
  );
}
