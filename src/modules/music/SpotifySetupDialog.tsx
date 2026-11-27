"use client";

import { useState } from "react";
import { useT, T } from "@/lib/i18n";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { TextInput } from "@/components/fluent/TextInput";
import { clientIdPropio, esClientIdValido, guardarClientIdPropio, quitarClientIdPropio } from "@/services/music/oauth";

const STEPS = [
  {
    title: T("Entra al panel de desarrolladores"),
    body: T("Abre developer.spotify.com/dashboard e inicia sesión. La cuenta dueña de la app debe tener Spotify Premium activo."),
  },
  {
    title: T("Crea una app"),
    body: T("Ponle cualquier nombre. En «Redirect URI» escribe exactamente http://127.0.0.1:3000/api/spotify/callback (con 127.0.0.1, no con localhost). Marca «Web API» y «Web Playback SDK»."),
  },
  {
    title: T("Pega su Client ID aquí"),
    body: T("En Settings verás el Client ID. Pégalo abajo y pulsa «Guardar»; después usa «Conectar con Spotify Premium». Nunca hace falta el Client Secret."),
  },
];

/**
 * Opcional: usar la app de Spotify propia en vez de la de Xook. Solo hace falta si la cuenta no está autorizada en la de Xook
 * (Spotify limita las apps nuevas a las cuentas que su dueño agrega a mano). Ya no hay que editar ningún archivo.
 */
export function SpotifySetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [propio, setPropio] = useState<string | null>(() => clientIdPropio());
  const [texto, setTexto] = useState("");
  const [error, setError] = useState(false);

  const guardar = () => {
    if (!esClientIdValido(texto) || !guardarClientIdPropio(texto)) {
      setError(true);
      return;
    }
    setPropio(texto.trim());
    setTexto("");
    setError(false);
  };
  const volver = () => {
    quitarClientIdPropio();
    setPropio(null);
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("Usar mi propia app de Spotify")} maxWidth={620}>
      <InfoBar severity="info" title={t("Normalmente no hace falta.")} className="mb-4">
        {t("«Conectar con Spotify Premium» ya usa la app de Xook: solo inicias sesión en la página de Spotify. Esto es para cuando tu cuenta no está autorizada en esa app y prefieres usar la tuya.")}
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
              <p className="text-body font-semibold text-fg">{t(s.title)}</p>
              <p className="text-body text-fg-secondary">{t(s.body)}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-col gap-3 rounded-input border border-stroke bg-layer p-3">
        {propio ? (
          <>
            <p className="text-body text-fg">
              <span className="font-semibold">{t("Usando tu propia app de Spotify.")}</span>{" "}
              <span className="text-fg-secondary">{t("Client ID: {id}…", { id: propio.slice(0, 8) })}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={volver}>{t("Volver a la app de Xook")}</Button>
              <Button variant="accent" onClick={onClose}>
                {t("Listo")}
              </Button>
            </div>
            <p className="text-caption text-fg-tertiary">{t("Se cerró la sesión anterior: pulsa «Conectar con Spotify Premium» para iniciar sesión de nuevo.")}</p>
          </>
        ) : (
          <>
            <TextInput
              label={t("Client ID de tu app")}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardar();
              }}
              placeholder="0123456789abcdef0123456789abcdef"
              spellCheck={false}
              autoComplete="off"
              error={error ? t("Un Client ID tiene 32 letras y números (de la a a la f).") : undefined}
            />
            <div>
              <Button variant="accent" disabled={texto.trim() === ""} onClick={guardar}>
                {t("Guardar")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
