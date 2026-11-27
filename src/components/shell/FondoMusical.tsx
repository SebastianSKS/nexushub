"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useColoresCaratula } from "@/hooks/useColoresCaratula";
import { ahorroDeAhora, useAjustesStore } from "@/store/ajustes-store";
import { useReproductorStore } from "@/store/reproductor-store";

/**
 * «Fondo según la música»: detrás de toda la ventana (que es translúcida) los colores de la portada de lo que suena, en
 * tres manchas suaves que se mueven despacio; en pausa se quedan quietas. Se apaga en Configuración › Apariencia, y
 * solo con el modo de bajo consumo. El movimiento respeta el ajuste de animaciones (ver fluent.css).
 */
export function FondoMusical() {
  const activado = useAjustesStore((s) => s.fondoMusical);
  const modo = useAjustesStore((s) => s.modoAhorro);
  const caratula = useReproductorStore((s) => s.pista?.caratula ?? "");
  const suena = useReproductorStore((s) => s.reproduciendo);
  // Lo que el equipo dice de sí mismo solo se conoce en la ventana (no al generar la página).
  const [ahorro, setAhorro] = useState(false);
  useEffect(() => setAhorro(ahorroDeAhora(modo)), [modo]);
  const colores = useColoresCaratula(activado && !ahorro ? caratula : "");

  return (
    <div className="fondo-musical" data-suena={suena} aria-hidden>
      <AnimatePresence>
        {colores && (
          <motion.div key={colores.join("-")} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }}>
            {colores.map((color, i) => (
              <span key={i} className={`mancha mancha-${i + 1}`} style={{ "--mancha": `rgb(${color.join(" ")})` } as CSSProperties} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
