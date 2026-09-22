"use client";

import { useEffect } from "react";

/** Radio (px) alrededor del cursor dentro del cual un elemento recibe el resplandor. */
const REACH = 160;

/**
 * Reveal highlight de Fluent. Un único listener de mousemove actualiza las
 * custom properties --mx / --my de los elementos `.reveal` cercanos al cursor.
 * Los elementos fuera de alcance se reinician una sola vez, y el trabajo se
 * agrupa en un requestAnimationFrame para no saturar en cuadrículas grandes.
 */
export function useRevealHighlight() {
  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (!canHover) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const lit = new Set<HTMLElement>();

    const update = () => {
      frame = 0;
      const next = new Set<HTMLElement>();
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
        const r = el.getBoundingClientRect();
        const near =
          x > r.left - REACH &&
          x < r.right + REACH &&
          y > r.top - REACH &&
          y < r.bottom + REACH;
        if (near) {
          el.style.setProperty("--mx", `${x - r.left}px`);
          el.style.setProperty("--my", `${y - r.top}px`);
          next.add(el);
        }
      });
      lit.forEach((el) => {
        if (!next.has(el)) {
          el.style.removeProperty("--mx");
          el.style.removeProperty("--my");
        }
      });
      lit.clear();
      next.forEach((el) => lit.add(el));
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => {
      x = -9999;
      y = -9999;
      if (!frame) frame = requestAnimationFrame(update);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
