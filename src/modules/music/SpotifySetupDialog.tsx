"use client";

import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";

const STEPS = [
  {
    title: "Entra al panel de desarrolladores",
    body: "Abre developer.spotify.com/dashboard e inicia sesión. Desde febrero de 2026 la cuenta dueña de la app debe tener Spotify Premium activo.",
  },
  {
    title: "Crea una app",
    body: "Ponle cualquier nombre. En «Redirect URI» escribe exactamente http://127.0.0.1:3000/api/spotify/callback (con 127.0.0.1, no con localhost). Marca «Web API» y «Web Playback SDK».",
  },
  {
    title: "Copia el Client ID",
    body: "En Settings verás el Client ID. Es lo único que hace falta: activa «Conectar con Spotify Premium», y una vez conectado también permite buscar cualquier canción con tu propia cuenta.",
  },
  {
    title: "Guárdalo en Nexo",
    body: "En tu archivo .env.local escribe NEXT_PUBLIC_SPOTIFY_CLIENT_ID= con ese valor. Reinicia la aplicación y ábrela en http://127.0.0.1:3000.",
  },
];

/** Guía para activar el Modo Conectado. Explica sin adornos que hace falta Premium. */
export function SpotifySetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Activar Spotify Premium en Nexo" maxWidth={620}>
      <InfoBar severity="warning" title="Necesitas Spotify Premium para esto." className="mb-4">
        Con una cuenta gratuita no se puede crear una app que funcione. Sin Premium, Nexo usa el Modo Invitado: sugeridos, enlaces pegados y vista previa de 30 s.
      </InfoBar>
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span
              className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-semibold text-accent-on"
              aria-hidden
            >
              {i + 1}
            </span>
            <div>
              <p className="text-body font-semibold text-fg">{s.title}</p>
              <p className="text-body text-fg-secondary">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-input border border-stroke bg-layer p-3">
        <p className="mb-1 text-caption text-fg-secondary">Así queda .env.local:</p>
        <code className="block select-all whitespace-pre font-mono text-caption text-fg">{"NEXT_PUBLIC_SPOTIFY_CLIENT_ID=tu_client_id"}</code>
      </div>
      <p className="mt-3 text-caption text-fg-tertiary">
        Nunca hace falta el Client Secret: Nexo no lo usa ni lo guarda, porque viajaría dentro de la aplicación instalada.
      </p>
    </Dialog>
  );
}
