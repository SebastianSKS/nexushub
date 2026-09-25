"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSync20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { clienteIdConfigurado } from "@/services/music/oauth";
import { useMusicStore } from "@/store/music-store";
import { conectarSpotify, PanelConexion } from "./ConnectionPanel";
import { ConsejosMusica } from "./ConsejosMusica";
import { FavoritosRecientes } from "./FavoritosRecientes";
import { AvisoPermisos } from "./PermisosSpotify";
import { InicioMusica } from "./InicioMusica";
import { MusicGrid } from "./MusicGrid";
import { MusicSearchBar } from "./MusicSearchBar";
import { SpotifySetupDialog } from "./SpotifySetupDialog";

/** /musica — sugeridos y búsqueda. Modo Invitado (embed oficial) o Modo Conectado (Premium). */
export function PaginaMusica() {
  const estado = useMusicStore((s) => s.connection.status);
  const connectAvailable = clienteIdConfigurado();
  const cargando = useMusicStore((s) => s.status === "loading");
  // Con una búsqueda hecha, los resultados van primero: nada de favoritos ni recientes por delante.
  const buscando = useMusicStore((s) => s.query.trim() !== "");
  const faltanPermisos = useMusicStore((s) => (s.permisosExtra === false && s.query === "") || s.permisosBiblioteca === "faltan");
  const [guia, setGuia] = useState(false);

  // Abre con contenido y detecta qué modos ofrece este equipo.
  useEffect(() => {
    const store = useMusicStore.getState();
    if (store.status === "idle") void store.load("");
  }, []);

  const conectado = estado === "connected";

  // La cuenta se detecta un momento después de abrir la página: al quedar conectada, las sugerencias se
  // vuelven a pedir para que sean las de tu cuenta (lo que escuchas, novedades…) y no las de invitado.
  const estabaConectado = useRef(false);
  useEffect(() => {
    if (conectado && !estabaConectado.current) {
      const store = useMusicStore.getState();
      if (store.status !== "idle") void store.load(store.query);
    }
    estabaConectado.current = conectado;
  }, [conectado]);
  const actualizar = (
    <Button icon={<ArrowSync20Regular className={cargando ? "animate-spin" : undefined} />} disabled={cargando} onClick={() => void useMusicStore.getState().otrasSugerencias()}>
      {cargando ? "Actualizando…" : "Otras sugerencias"}
    </Button>
  );
  const accion =
    conectado ? (
      <Button variant="accent" icon={<ArrowSync20Regular className={cargando ? "animate-spin" : undefined} />} disabled={cargando} onClick={() => void useMusicStore.getState().otrasSugerencias()}>
        {cargando ? "Actualizando…" : "Otras sugerencias"}
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
        descripcion="Elige una canción y la música sigue sola. Escucha como invitado o conecta tu cuenta Premium."
        accion={accion}
        principal={
          <>
            <div className="flex flex-wrap items-center gap-3">
              <MusicSearchBar />
              {!conectado && actualizar}
            </div>
            {conectado && faltanPermisos && (
              <AvisoPermisos />
            )}
            {conectado && !buscando && <ConsejosMusica />}
            {conectado && !buscando && <InicioMusica />}
            {!buscando && <FavoritosRecientes />}
            <MusicGrid />
          </>
        }
        lateral={<PanelConexion />}
      />
      <SpotifySetupDialog open={guia} onClose={() => setGuia(false)} />
    </>
  );
}
