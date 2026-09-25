"use client";

import { useEffect } from "react";
import { cargarIconosProgramas, RESERVA_PROGRAMA, useIconosProgramas, type ClavePrograma } from "@/services/iconos-programas";

/**
 * El logo original de un programa (Word, Excel…), tal como Windows lo muestra. Si el programa no está instalado
 * (o todavía no llega), un cuadro con su color y su inicial. Úsalo siempre que Nexo nombre uno de estos programas.
 */
export function LogoPrograma({ programa, tam = 36 }: { programa: ClavePrograma; tam?: number }) {
  const { color, inicial } = RESERVA_PROGRAMA[programa];
  const icono = useIconosProgramas((s) => s.iconos[programa]);
  useEffect(() => {
    void cargarIconosProgramas([programa]);
  }, [programa]);

  if (icono) {
    // eslint-disable-next-line @next/next/no-img-element -- es una imagen local (data URL) sacada de Windows
    return <img src={icono} alt="" aria-hidden draggable={false} className="shrink-0 select-none object-contain" style={{ width: tam, height: tam }} />;
  }
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-[8px] font-semibold" style={{ width: tam, height: tam, backgroundColor: color, color: "#fff", fontSize: tam * 0.4 }}>
      <span>{inicial}</span>
    </span>
  );
}
