"use client";

import { useEffect, useRef } from "react";
import { useHuecoStore } from "@/store/hueco-store";

/**
 * Reserva en la página el espacio 16:9 donde se dibujará el video. No contiene el reproductor: solo mide
 * su posición (ResizeObserver + scroll + resize) y se la comunica al contenedor fijo de la raíz.
 */
export function HuecoReproductor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      useHuecoStore.getState().setRect({ x: r.left, y: r.top, ancho: r.width, alto: r.height });
    };
    medir();

    const ro = new ResizeObserver(medir);
    ro.observe(el);
    const main = document.getElementById("contenido");
    ro.observe(document.documentElement);
    window.addEventListener("resize", medir);
    main?.addEventListener("scroll", medir, { passive: true });

    // La página entra con una animación de desplazamiento: se mide cada fotograma mientras dura.
    let raf = 0;
    const inicio = performance.now();
    const tick = () => {
      medir();
      if (performance.now() - inicio < 700) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", medir);
      main?.removeEventListener("scroll", medir);
      useHuecoStore.getState().setRect(null);
    };
  }, []);

  return <div ref={ref} className="aspect-video w-full rounded-control bg-black" aria-hidden />;
}
