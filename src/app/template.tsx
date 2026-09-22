"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { PAGE_VARIANTS } from "@/lib/motion";

/**
 * Se vuelve a montar en cada navegación (a diferencia de layout.tsx): da la entrada de página
 * (fade + 12 px de desplazamiento vertical) sin tocar el armazón de la ventana.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}
