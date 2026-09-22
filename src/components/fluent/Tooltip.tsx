"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ENTER, EXIT } from "@/lib/motion";

interface TooltipProps {
  text: string;
  children: ReactNode;
  /** Solo se muestra si es true (p. ej. cuando la barra lateral está colapsada). */
  enabled?: boolean;
  side?: "right" | "bottom";
}

/** Tooltip Fluent con retardo de 400 ms; aparece también con foco de teclado. */
export function Tooltip({ text, children, enabled = true, side = "right" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 400);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={enabled && open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {enabled && open && (
          <motion.div
            id={id}
            role="tooltip"
            initial={{ opacity: 0, x: side === "right" ? -4 : 0, y: side === "bottom" ? -4 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0, transition: ENTER }}
            exit={{ opacity: 0, transition: EXIT }}
            className={
              "acrylic pointer-events-none absolute z-50 whitespace-nowrap rounded-control px-3 py-1.5 text-caption text-fg shadow-flyout " +
              (side === "right"
                ? "left-full top-1/2 ml-2 -translate-y-1/2"
                : "left-1/2 top-full mt-2 -translate-x-1/2")
            }
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
