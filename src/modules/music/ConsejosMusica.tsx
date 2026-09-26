"use client";

import { useT, T } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import type { NombreGlifo } from "@/lib/glifos";

const CLAVE = "nexushub-musica-consejos-vistos";

const CONSEJOS: { glifo: NombreGlifo; titulo: string; texto: string }[] = [
  { glifo: "reproducir", titulo: T("Elige una canción y ya"), texto: T("La música sigue sola con canciones parecidas, como en Spotify. No hay que armar ninguna lista.") },
  { glifo: "mas", titulo: T("Los tres puntos (o clic derecho)"), texto: T("En cada canción: guardarla en Me gusta, añadirla a una playlist, ir a su artista o su álbum.") },
  { glifo: "musica", titulo: T("Pulsa «Letra» en la barra"), texto: T("Ves la letra en pantalla grande y la línea que suena se ilumina. Toca una línea para saltar a ella.") },
  { glifo: "reloj", titulo: T("Temporizador para dormir"), texto: T("El reloj de la barra apaga la música solo, en 5 minutos, 1 hora o al terminar la canción.") },
];

/** Cuatro consejos, la primera vez que abres Música con tu cuenta. Se cierran con la «x» y no vuelven a salir. */
export function ConsejosMusica() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(CLAVE) !== "1");
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;
  const cerrar = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(CLAVE, "1");
    } catch {
      /* sin almacenamiento: volverá a salir la próxima vez */
    }
  };

  return (
    <Card className="p-4" role="region" aria-label={t("Consejos para usar Música")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-subtitle text-fg">{t("Cómo sacarle provecho a Música")}</h2>
        <IconButton label={t("Cerrar los consejos")} onClick={cerrar} className="h-7 w-7">
          <Glifo nombre="cerrar" tam={10} />
        </IconButton>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {CONSEJOS.map((c) => (
          <li key={c.titulo} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on" aria-hidden>
              <Glifo nombre={c.glifo} tam={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-fg">{t(c.titulo)}</span>
              <span className="block text-caption text-fg-secondary">{t(c.texto)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
