"use client";

import clsx from "clsx";

/**
 * Barras animadas puramente decorativas (".viz-bar"/".viz-playing" en fluent.css): NO analizan el audio
 * real. Ni el embed/SDK de Spotify ni el iframe de YouTube dejan que la página lea su sonido (protección
 * de contenido / origen cruzado), así que un ecualizador que de verdad reaccione al audio no es posible
 * aquí. Solo anima mientras suena; `aria-hidden` porque no aporta información.
 */
export function EcualizadorVisual({ activo, className }: { activo: boolean; className?: string }) {
  return (
    <div aria-hidden className={clsx("flex h-4 items-end gap-[3px]", activo && "viz-playing", className)}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="viz-bar h-full w-[3px] rounded-full bg-accent" style={{ animationDelay: `${i * 130}ms` }} />
      ))}
    </div>
  );
}
