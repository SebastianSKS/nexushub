import type { Transition } from "framer-motion";

/** Curva Fluent "decelerate": cubic-bezier(0, 0, 0, 1) */
export const FLUENT_EASE = [0, 0, 0, 1] as const;

export const ENTER: Transition = { duration: 0.25, ease: FLUENT_EASE };
export const EXIT: Transition = { duration: 0.15, ease: FLUENT_EASE };

/** Resorte del indicador de selección de la barra lateral */
export const PILL_SPRING: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.8,
};

/** Entrada de contenido: fade + desplazamiento vertical de 12px */
export const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: ENTER },
  exit: { opacity: 0, transition: EXIT },
};
