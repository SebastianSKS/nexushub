"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Glifo } from "@/components/fluent/Glifo";
import { rutaVer } from "@/lib/rutas";
import { useHuecoStore } from "@/store/hueco-store";
import { useReproductorStore } from "@/store/reproductor-store";

const MINI_ANCHO = 320;
const MINI_ALTO = 180;
const MARGEN = 16;
const ALTO_BARRA_TITULO = 32;
const ALTO_BARRA_ESTADO = 28;
const ALTO_BARRA_MUSICA = 72;

type Modo = "oculto" | "hueco" | "mini";

const TRANSICION = "transform 300ms cubic-bezier(0,0,0,1), width 300ms cubic-bezier(0,0,0,1), height 300ms cubic-bezier(0,0,0,1)";

/**
 * EL contenedor del video. Se monta UNA vez en la raíz y nunca cambia de padre ni se recrea: por eso el
 * iframe de YouTube no se recarga y el video no se reinicia al cambiar de página. Solo cambia dónde se
 * dibuja: encima del «hueco» de /video/ver, o como miniatura flotante en la esquina inferior derecha.
 * Solo se animan transform, width y height (nunca top/left), y solo al cambiar de modo.
 */
export function ContenedorVideo({ hostRef }: { hostRef: RefObject<HTMLDivElement | null> }) {
  const contRef = useRef<HTMLDivElement>(null);
  const modoPrevio = useRef<Modo>("oculto");
  const temporizador = useRef<number | undefined>(undefined);

  const rect = useHuecoStore((s) => s.rect);
  const hayVideo = useReproductorStore((s) => s.fuente === "youtube" && s.pista !== null);
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);
  const idVideo = useReproductorStore((s) => s.pista?.id);
  const modo: Modo = !hayVideo ? "oculto" : rect ? "hueco" : "mini";

  // Posición de la miniatura: null = esquina inferior derecha por defecto; si se arrastra, la que dejó el usuario.
  const [miniPos, setMiniPos] = useState<{ x: number; y: number } | null>(null);
  const [ventana, setVentana] = useState({ ancho: 1280, alto: 800 });
  const arrastre = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const leer = () => setVentana({ ancho: window.innerWidth, alto: window.innerHeight });
    leer();
    window.addEventListener("resize", leer);
    return () => window.removeEventListener("resize", leer);
  }, []);

  const limitar = (x: number, y: number) => ({
    x: Math.min(Math.max(0, x), Math.max(0, ventana.ancho - MINI_ANCHO)),
    y: Math.min(Math.max(ALTO_BARRA_TITULO, y), Math.max(ALTO_BARRA_TITULO, ventana.alto - ALTO_BARRA_ESTADO - MINI_ALTO)),
  });
  const porDefecto = { x: ventana.ancho - MINI_ANCHO - MARGEN, y: ventana.alto - ALTO_BARRA_ESTADO - ALTO_BARRA_MUSICA * 0 - MINI_ALTO - MARGEN };
  const mini = miniPos ? limitar(miniPos.x, miniPos.y) : limitar(porDefecto.x, porDefecto.y);

  // Coloca el contenedor. Se hace directamente sobre el elemento: así el estilo cambia en el mismo
  // fotograma que el modo y la transición (solo al cambiar de modo) se aplica de forma predecible.
  useLayoutEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const previo = modoPrevio.current;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animar = !reducido && previo !== modo && previo !== "oculto" && modo !== "oculto";
    modoPrevio.current = modo;

    window.clearTimeout(temporizador.current);
    el.style.transition = animar ? TRANSICION : "none";
    if (animar) temporizador.current = window.setTimeout(() => (el.style.transition = "none"), 340);

    if (modo === "hueco" && rect) {
      el.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      el.style.width = `${rect.ancho}px`;
      el.style.height = `${rect.alto}px`;
      // El video no puede salirse del área de contenido al hacer scroll (no debe tapar barras ni panel).
      const m = document.getElementById("contenido")?.getBoundingClientRect();
      el.style.clipPath = m
        ? `inset(${Math.max(0, m.top - rect.y)}px ${Math.max(0, rect.x + rect.ancho - m.right)}px ${Math.max(0, rect.y + rect.alto - m.bottom)}px ${Math.max(0, m.left - rect.x)}px)`
        : "none";
      el.style.boxShadow = "none";
    } else {
      el.style.transform = `translate(${mini.x}px, ${mini.y}px)`;
      el.style.width = `${MINI_ANCHO}px`;
      el.style.height = `${MINI_ALTO}px`;
      el.style.clipPath = "none";
      el.style.boxShadow = modo === "mini" ? "0 8px 24px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08)" : "none";
    }
    el.style.visibility = modo === "oculto" ? "hidden" : "visible";
    el.style.pointerEvents = modo === "oculto" ? "none" : "auto";
  }, [modo, rect, mini.x, mini.y]);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const empezarArrastre = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button,a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { dx: e.clientX - mini.x, dy: e.clientY - mini.y };
  };
  const arrastrar = (e: PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current) return;
    setMiniPos(limitar(e.clientX - arrastre.current.dx, e.clientY - arrastre.current.dy));
  };
  const soltar = (e: PointerEvent<HTMLDivElement>) => {
    arrastre.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const alternar = () => useReproductorStore.getState().alternar();
  const cerrar = () => useReproductorStore.getState().cerrar();

  return (
    <div
      ref={contRef}
      role="region"
      aria-label="Reproductor de video"
      className="fixed left-0 top-0 z-30 overflow-hidden bg-black"
      style={{ borderRadius: modo === "mini" ? 8 : 8, willChange: "transform, width, height", visibility: "hidden" }}
    >
      {/* Aquí YouTube inserta su iframe. React no lo toca: nunca se recrea. */}
      <div ref={hostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />

      {modo === "mini" && (
        <div
          onPointerDown={empezarArrastre}
          onPointerMove={arrastrar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="group/mini absolute inset-x-0 top-0 flex h-9 cursor-move touch-none items-center gap-1 bg-gradient-to-b from-black/80 to-transparent px-1 opacity-0 transition-opacity duration-exit hover:opacity-100 focus-within:opacity-100"
        >
          <Link
            href={rutaVer(idVideo ?? "")}
            className="rounded-control flex h-7 items-center gap-1.5 px-2 text-caption font-semibold text-white hover:bg-white/15"
          >
            <Glifo nombre="contraer" tam={14} />
            Volver al video
          </Link>
          <span className="flex-1" />
          <button
            type="button"
            onClick={alternar}
            aria-label={reproduciendo ? "Pausar" : "Reproducir"}
            title={reproduciendo ? "Pausar" : "Reproducir"}
            className="rounded-control flex h-7 w-7 items-center justify-center text-white hover:bg-white/15"
          >
            <Glifo nombre={reproduciendo ? "pausar" : "reproducir"} tam={14} />
          </button>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar miniatura y detener el video"
            title="Cerrar"
            className="rounded-control flex h-7 w-7 items-center justify-center text-white hover:bg-white/15"
          >
            <Glifo nombre="cerrar" tam={12} />
          </button>
        </div>
      )}
    </div>
  );
}
