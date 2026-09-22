"use client";

import { useEffect, useState } from "react";
import { ArrowSync20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { clienteIdConfigurado } from "@/services/music/oauth";
import { useMusicStore } from "@/store/music-store";
import { conectarSpotify, PanelConexion } from "./ConnectionPanel";
import { FavoritosRecientes } from "./FavoritosRecientes";
import { MusicGrid } from "./MusicGrid";
import { MusicSearchBar } from "./MusicSearchBar";
import { SpotifySetupDialog } from "./SpotifySetupDialog";

/** /musica — sugeridos y búsqueda. Modo Invitado (embed oficial) o Modo Conectado (Premium). */
export function PaginaMusica() {
  const estado = useMusicStore((s) => s.connection.status);
  const connectAvailable = clienteIdConfigurado();
  const cargando = useMusicStore((s) => s.status === "loading");
  const [guia, setGuia] = useState(false);

  // Abre con contenido y detecta qué modos ofrece este equipo.
  useEffect(() => {
    const store = useMusicStore.getState();
    if (store.status === "idle") void store.load("");
  }, []);

  const conectado = estado === "connected";
  const accion =
    conectado ? (
      <Button variant="accent" icon={<ArrowSync20Regular />} disabled={cargando} onClick={() => void useMusicStore.getState().load("")}>
        Actualizar sugeridos
      </Button>
    ) : estado === "connecting" ? (
      <Button variant="accent" disabled>
        Conectando…
      </Button>
    ) : connectAvailable ? (
      <Button variant="accent" onClick={conectarSpotify}>
        Conectar con Spotify Premium
      </Button>
    ) : (
      <Button variant="accent" onClick={() => setGuia(true)}>
        Cómo activar Premium
      </Button>
    );

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Música" }]}
        titulo="Música"
        descripcion="Escucha Spotify como invitado o conecta tu cuenta Premium."
        accion={accion}
        principal={
          <>
            <MusicSearchBar />
            <FavoritosRecientes />
            <MusicGrid />
          </>
        }
        lateral={<PanelConexion />}
      />
      <SpotifySetupDialog open={guia} onClose={() => setGuia(false)} />
    </>
  );
}
