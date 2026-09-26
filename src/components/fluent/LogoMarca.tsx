"use client";

import { siSpotify, siYoutube } from "simple-icons";
import { LogoPrograma } from "@/components/fluent/LogoPrograma";
import type { ClavePrograma } from "@/services/iconos-programas";

/** Lo que Nexo puede mostrar con su logo original: un programa de Windows (Word, PDF…) o un servicio (Spotify, YouTube). */
export type MarcaId = ClavePrograma | "spotify" | "youtube";

const SERVICIOS = {
  spotify: siSpotify,
  youtube: siYoutube,
} as const;

/**
 * El logo original de algo que Nexo nombra. Los programas de Windows salen tal como Windows los muestra (`LogoPrograma`);
 * los servicios, con su forma y su color oficial. Úsalo siempre que Nexo mencione uno de estos nombres.
 */
export function LogoMarca({ marca, tam = 20 }: { marca: MarcaId; tam?: number }) {
  if (marca === "spotify" || marca === "youtube") {
    const icono = SERVICIOS[marca];
    return (
      <span aria-hidden className="flex shrink-0 items-center justify-center rounded-[6px]" style={{ width: tam, height: tam, backgroundColor: `#${icono.hex}` }}>
        <svg viewBox="0 0 24 24" width={tam * 0.62} height={tam * 0.62} fill="#fff">
          <path d={icono.path} />
        </svg>
      </span>
    );
  }
  return <LogoPrograma programa={marca} tam={tam} />;
}
