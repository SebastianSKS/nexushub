"use client";

import { useT, T } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart20Filled } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { fetchMyPlaylists } from "@/services/music/api";
import { albumesGuardados, artistasSeguidos } from "@/services/music/artista";
import { useMusicStore } from "@/store/music-store";
import type { MusicItem } from "@/types/music";
import { conectarSpotify } from "./ConnectionPanel";
import { AvisoPermisos } from "./PermisosSpotify";
import { MusicCard } from "./MusicCard";

type Pestana = "playlists" | "albumes" | "artistas";
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

/** /musica/biblioteca — tus playlists, álbumes guardados y artistas que sigues. */
export function PaginaBiblioteca() {
  const t = useT();
  const conectado = useMusicStore((s) => s.connection.status === "connected");
  const playlists = useMusicStore((s) => s.playlists);
  const permisos = useMusicStore((s) => s.permisosBiblioteca);
  const [pestana, setPestana] = useState<Pestana>("playlists");
  const [albumes, setAlbumes] = useState<MusicItem[] | null>(null);
  const [artistas, setArtistas] = useState<MusicItem[] | null>(null);
  const [fallo, setFallo] = useState<"permisos" | "error" | null>(null);

  useEffect(() => {
    if (!conectado) return;
    void fetchMyPlaylists().then((p) => useMusicStore.getState().setPlaylists(p));
  }, [conectado]);

  useEffect(() => {
    if (!conectado) return;
    setFallo(null);
    if (pestana === "albumes" && albumes === null) {
      void albumesGuardados().then((r) => {
        if (r.resultado === "ok") setAlbumes(r.items);
        else setFallo(r.resultado);
      });
    }
    if (pestana === "artistas" && artistas === null) {
      void artistasSeguidos().then((r) => {
        if (r.resultado === "ok") setArtistas(r.items);
        else setFallo(r.resultado);
      });
    }
  }, [conectado, pestana, albumes, artistas]);

  const deLista = useMemo<MusicItem[]>(() => playlists.map((p) => ({ kind: "playlist", id: p.id, title: p.name, subtitle: `${t("Playlist")}${p.tracks !== undefined ? ` · ${t("{n} canciones", { n: p.tracks })}` : ""}`, cover: p.cover ?? p.image ?? "" })), [playlists, t]);

  const vacio = (texto: string) => (
    <Card className="p-6">
      <p className="text-body text-fg">{texto}</p>
    </Card>
  );

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Música", href: "/musica" }, { etiqueta: "Tu biblioteca" }]}
      titulo={t("Tu biblioteca")}
      descripcion={t("Tus playlists, álbumes guardados y artistas que sigues.")}
      principal={
        !conectado ? (
          <InfoBar severity="info" title={t("Conecta tu cuenta de Spotify para ver tu biblioteca.")} action={<Button onClick={conectarSpotify}>{t("Conectar")}</Button>}>
            {t("Necesitas Spotify Premium conectado en la sección Música.")}
          </InfoBar>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="max-w-[420px]">
              <SegmentedControl<Pestana>
                label={t("Biblioteca")}
                etiquetaVisible={false}
                value={pestana}
                options={[
                  { value: "playlists", label: t("Playlists") },
                  { value: "albumes", label: t("Álbumes") },
                  { value: "artistas", label: t("Artistas") },
                ]}
                onChange={setPestana}
              />
            </div>
            {(fallo === "permisos" || (permisos === "faltan" && pestana !== "playlists")) && (
              <AvisoPermisos texto={T("Para ver tus álbumes guardados y los artistas que sigues, Spotify te pide tu permiso una sola vez. Regresas justo aquí.")} />
            )}
            {fallo === "error" && <InfoBar severity="warning" title={t("No se pudo cargar. Inténtalo de nuevo en un momento.")} />}

            {pestana === "playlists" && (
              <div className={GRID}>
                <Link href="/musica/me-gusta" className="rounded-control reveal group block border border-stroke bg-layer p-3 text-left shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                  <span className="flex aspect-square w-full items-center justify-center rounded-input text-white shadow-card" style={{ backgroundImage: "linear-gradient(135deg, #4b2cff, #a8c0ff)" }} aria-hidden>
                    <Heart20Filled style={{ width: 48, height: 48 }} />
                  </span>
                  <span className="mt-3 block truncate text-body font-semibold text-fg">{t("Canciones que te gustan")}</span>
                  <span className="mt-0.5 block truncate text-caption text-fg-secondary">{t("Playlist")}</span>
                </Link>
                {deLista.map((p) => (
                  <MusicCard key={p.id} item={p} active={false} onPlay={() => undefined} />
                ))}
              </div>
            )}
            {pestana === "albumes" && (albumes === null ? !fallo && <p className="text-body text-fg-secondary" role="status">{t("Cargando…")}</p> : albumes.length === 0 ? vacio(t("Aún no has guardado álbumes.")) : (
              <div className={GRID}>
                {albumes.map((a) => (
                  <MusicCard key={a.id} item={a} active={false} onPlay={() => undefined} />
                ))}
              </div>
            ))}
            {pestana === "artistas" && (artistas === null ? !fallo && <p className="text-body text-fg-secondary" role="status">{t("Cargando…")}</p> : artistas.length === 0 ? vacio(t("Aún no sigues a ningún artista. Entra a la página de uno y pulsa Seguir.")) : (
              <div className={GRID}>
                {artistas.map((a) => (
                  <MusicCard key={a.id} item={a} active={false} onPlay={() => undefined} />
                ))}
              </div>
            ))}
          </div>
        )
      }
    />
  );
}
