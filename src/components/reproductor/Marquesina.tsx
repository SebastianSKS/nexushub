"use client";

import clsx from "clsx";
import { useLayoutEffect, useRef, useState } from "react";

/** Texto de una línea que se desplaza de un lado a otro solo cuando no cabe. Respeta «reducir movimiento». */
export function Marquesina({ texto, className }: { texto: string; className?: string }) {
  const fuera = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLSpanElement>(null);
  const [desborde, setDesborde] = useState(0);

  useLayoutEffect(() => {
    const medir = () => {
      if (fuera.current && dentro.current) setDesborde(Math.max(0, dentro.current.scrollWidth - fuera.current.clientWidth));
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (fuera.current) ro.observe(fuera.current);
    return () => ro.disconnect();
  }, [texto]);

  return (
    <div ref={fuera} className={clsx("overflow-hidden whitespace-nowrap", className)} title={texto}>
      <span
        ref={dentro}
        className={clsx("inline-block", desborde > 0 && "marquesina-mov")}
        style={desborde > 0 ? ({ "--desborde": `-${desborde}px` } as React.CSSProperties) : undefined}
      >
        {texto}
      </span>
    </div>
  );
}
