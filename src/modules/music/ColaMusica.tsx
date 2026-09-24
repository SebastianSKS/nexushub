"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { ALTO_BARRA_MUSICA } from "@/components/reproductor/BarraReproduccion";
import { ENTER, EXIT } from "@/lib/motion";
import { formatDuration } from "@/lib/video/format";
import { useAppStore } from "@/store/app-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

function Fila({ pista, sonando, propia, onAbrir, onQuitar }: { pista: Pista; sonando: boolean; propia?: boolean; onAbrir: () => void; onQuitar?: () => void }) {
  return (
    <li className={clsx("group flex items-center gap-2 rounded-control pr-1", sonando ? "bg-layer-alt" : "hover:bg-layer-alt")}>
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left" aria-label={`Reproducir ${pista.titulo}, ${pista.artista}`} aria-current={sonando ? "true" : undefined}>
        {pista.caratula ? (
          // eslint-disable-next-line @next/next/no-img-element -- carátula remota
          <img src={pista.caratula} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-[4px] object-cover" draggable={false} />
        ) : (
          <span className="h-10 w-10 shrink-0 rounded-[4px] bg-layer" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className={clsx("block truncate text-body", sonando ? "font-semibold text-accent-text" : "text-fg")}>{pista.titulo}</span>
          <span className="block truncate text-caption text-fg-secondary">
            {propia && <span className="mr-1 rounded-[3px] bg-accent px-1 text-accent-on">Añadida</span>}
            {pista.artista}
          </span>
        </span>
        {pista.duracion > 0 && <span className="tabular shrink-0 text-caption text-fg-secondary">{formatDuration(pista.duracion)}</span>}
      </button>
      {onQuitar && (
        <IconButton label={`Quitar ${pista.titulo} de la cola`} onClick={onQuitar} className="h-7 w-7 opacity-0 focus-visible:opacity-100 group-hover:opacity-100">
          <Glifo nombre="cerrar" tam={10} />
        </IconButton>
      )}
    </li>
  );
}

/** «Cola de reproducción»: lo que suena, lo que viene, y con qué se puede saltar, quitar o vaciar. Sale sobre la barra de música. */
export function ColaMusica() {
  const abierta = useAppStore((s) => s.colaMusicaAbierta);
  const cerrar = () => useAppStore.getState().setColaMusicaAbierta(false);
  const cola = useReproductorStore((s) => s.cola);
  const indice = useReproductorStore((s) => s.indiceActual);
  const propias = useReproductorStore((s) => s.usuarioEnCola);
  const visible = useReproductorStore((s) => s.fuente === "spotify" && s.pista !== null);
  const { irAIndice, quitarDeCola, vaciarProximas } = useReproductorStore.getState();

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierta]);

  useEffect(() => {
    if (!visible && abierta) cerrar();
  }, [visible, abierta]);

  if (typeof document === "undefined") return null;
  const actual = cola[indice];
  const proximas = cola.map((p, i) => ({ p, i })).filter(({ i }) => i > indice);
  const anteriores = cola.map((p, i) => ({ p, i })).filter(({ i }) => i < indice);

  return createPortal(
    <AnimatePresence>
      {abierta && visible && (
        <motion.section
          role="dialog"
          aria-label="Cola de reproducción"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: ENTER }}
          exit={{ opacity: 0, y: 8, transition: EXIT }}
          className="acrylic fixed right-3 z-[45] flex max-h-[min(560px,calc(100vh-180px))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[8px] shadow-flyout"
          style={{ bottom: ALTO_BARRA_MUSICA + 36 }}
        >
          <header className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
            <h2 className="text-subtitle text-fg">Cola de reproducción</h2>
            <div className="flex items-center gap-1">
              {proximas.length > 0 && (
                <button type="button" onClick={vaciarProximas} className="rounded-control px-2 py-1 text-caption text-accent-text hover:bg-layer-alt">
                  Vaciar
                </button>
              )}
              <IconButton label="Cerrar la cola" onClick={cerrar} className="h-7 w-7">
                <Glifo nombre="cerrar" tam={10} />
              </IconButton>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {actual && (
              <>
                <h3 className="px-2 pb-1 pt-2 text-caption font-semibold text-fg-secondary">Sonando ahora</h3>
                <ul>
                  <Fila pista={actual} sonando onAbrir={() => useAppStore.getState().setReproductorGrandeAbierto(true)} />
                </ul>
              </>
            )}
            <h3 className="px-2 pb-1 pt-3 text-caption font-semibold text-fg-secondary">A continuación{proximas.length > 0 ? ` · ${proximas.length}` : ""}</h3>
            {proximas.length === 0 ? (
              <p className="px-2 pb-2 text-caption text-fg-tertiary">No hay nada más en la cola. Añade canciones con «Añadir a la cola» (en el menú de cada canción) o deja que NexusHub siga con música parecida.</p>
            ) : (
              <ul>
                {proximas.map(({ p, i }) => (
                  <Fila key={`${p.id}-${i}`} pista={p} sonando={false} propia={propias.includes(`${p.fuente}:${p.id}`)} onAbrir={() => irAIndice(i)} onQuitar={() => quitarDeCola(i)} />
                ))}
              </ul>
            )}
            {anteriores.length > 0 && (
              <>
                <h3 className="px-2 pb-1 pt-3 text-caption font-semibold text-fg-secondary">Ya sonaron</h3>
                <ul className="opacity-80">
                  {anteriores.map(({ p, i }) => (
                    <Fila key={`${p.id}-${i}`} pista={p} sonando={false} onAbrir={() => irAIndice(i)} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>,
    document.body,
  );
}
