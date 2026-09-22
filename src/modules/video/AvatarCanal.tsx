"use client";

import { useState } from "react";

interface AvatarCanalProps {
  nombre: string;
  avatar: string | null;
  /** Lado en px. */
  tam?: number;
}

/** Avatar circular del canal. Si la imagen falta o no carga, muestra la inicial sobre el color de acento. */
export function AvatarCanal({ nombre, avatar, tam = 32 }: AvatarCanalProps) {
  const [fallo, setFallo] = useState(false);
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  if (avatar && !fallo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar remoto de YouTube
      <img
        src={avatar}
        alt=""
        width={tam}
        height={tam}
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFallo(true)}
        className="shrink-0 rounded-full bg-layer-alt object-cover"
        style={{ width: tam, height: tam }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-accent-on"
      style={{ width: tam, height: tam, backgroundColor: "var(--accent)", fontSize: tam * 0.42 }}
    >
      {inicial}
    </span>
  );
}
