"use client";

import { PlugConnected20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { clienteIdConfigurado, cerrarSesionSpotify, iniciarConexionSpotify } from "@/services/music/oauth";
import { useMusicStore } from "@/store/music-store";

export async function desconectarSpotify() {
  cerrarSesionSpotify();
  const s = useMusicStore.getState();
  s.setConnection({ status: "guest" });
  s.setPlaylists([]);
}

export const conectarSpotify = () => void iniciarConexionSpotify();

/** Estado de la conexión con Spotify: Modo Invitado, conectando, conectado, sin Premium o error. */
export function PanelConexion() {
  const connection = useMusicStore((s) => s.connection);
  const connectAvailable = clienteIdConfigurado();

  let body: React.ReactNode;
  switch (connection.status) {
    case "connecting":
      body = (
        <p className="text-body text-fg-secondary" role="status">
          Conectando con Spotify: comprobando tu cuenta y preparando el reproductor…
        </p>
      );
      break;

    case "connected":
      body = (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body text-fg">
            <span className="font-semibold">Conectado como {connection.name}.</span>{" "}
            <span className="text-fg-secondary">Reproducción completa con todos los controles.</span>
          </p>
          <Button onClick={() => void desconectarSpotify()}>Cerrar sesión de Spotify</Button>
        </div>
      );
      break;

    case "not-premium":
      body = (
        <InfoBar
          severity="warning"
          title={`La cuenta de Spotify${connection.name ? ` de ${connection.name}` : ""} no es Premium.`}
          action={
            <Button className="h-7" onClick={() => void desconectarSpotify()}>
              Cerrar sesión de Spotify
            </Button>
          }
        >
          El reproductor completo de Spotify solo funciona con Premium. Sigues en Modo Invitado: todo lo demás funciona, con vista previa de 30 s por canción.
        </InfoBar>
      );
      break;

    case "error":
      body = (
        <InfoBar
          severity="error"
          title={connection.message}
          action={
            <div className="flex gap-2">
              {connectAvailable && (
                <Button className="h-7" onClick={conectarSpotify}>
                  Reintentar
                </Button>
              )}
              <Button className="h-7" onClick={() => void desconectarSpotify()}>
                Cerrar sesión de Spotify
              </Button>
            </div>
          }
        >
          {connection.hint}
        </InfoBar>
      );
      break;

    default:
      body = (
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-accent-text"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
            aria-hidden
          >
            <PlugConnected20Regular />
          </span>
          <div className="min-w-[14rem] flex-1">
            <p className="text-body font-semibold text-fg">Modo Invitado · Vista previa de 30 s</p>
            <p className="text-body text-fg-secondary">
              Escuchas con el reproductor oficial de Spotify, sin iniciar sesión.{" "}
              {connectAvailable
                ? 'Si tienes Spotify Premium, usa «Conectar con Spotify Premium» (arriba) para oír canciones completas con todos los controles.'
                : "Si tienes Spotify Premium, usa «Cómo activar Premium» (arriba) para conectar tu cuenta y oír canciones completas."}
            </p>
          </div>
        </div>
      );
  }

  const bare = connection.status === "not-premium" || connection.status === "error";
  return bare ? body : <Card className="p-4">{body}</Card>;
}
