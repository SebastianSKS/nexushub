"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowShuffle20Regular, MoreHorizontal20Regular, Play20Filled } from "@fluentui/react-icons";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { IconButton } from "@/components/fluent/IconButton";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { formatDuration } from "@/lib/video/format";
import { cancionesQueTeGustan } from "@/services/music/biblioteca";
import { abrirMenuPista } from "@/store/menu-pista-store";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";
import { conectarSpotify } from "./ConnectionPanel";
import { AvisoPermisos } from "./PermisosSpotify";

/** /musica/me-gusta — «Canciones que te gustan» de tu cuenta de Spotify. */
export function PaginaMeGusta() {
  const conectado = useMusicStore((s) => s.connection.status === "connected");
  const estado = useMusicStore((s) => s.connection.status);
  const permisos = useMusicStore((s) => s.permisosBiblioteca);
  const sonando = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));
  const [pistas, setPistas] = useState<Pista[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<"permisos" | "error" | null>(null);

  const cargarMas = async (desde: number) => {
    setCargando(true);
    const r = await cancionesQueTeGustan(desde);
    setCargando(false);
    if (r.resultado !== "ok") {
      setFallo(r.resultado);
      return;
    }
    setFallo(null);
    setTotal(r.total);
    setPistas((prev) => (desde === 0 ? r.pistas : [...prev, ...r.pistas.filter((p) => !prev.some((x) => x.id === p.id))]));
  };

  useEffect(() => {
    if (conectado) void cargarMas(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado]);

  const reproducir = (i: number) => useReproductorStore.getState().reproducir(pistas[i]!, pistas, i);
  const aleatorio = () => {
    if (pistas.length === 0) return;
    useReproductorStore.getState().setAleatorio(true);
    reproducir(Math.floor(Math.random() * pistas.length));
  };

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Música", href: "/musica" }, { etiqueta: "Canciones que te gustan" }]}
      titulo="Canciones que te gustan"
      descripcion={conectado && total > 0 ? `${total} canciones guardadas en tu cuenta de Spotify` : "Lo que guardas con el corazón en Spotify."}
      accion={
        pistas.length > 0 && (
          <div className="flex gap-2">
            <Button icon={<ArrowShuffle20Regular />} onClick={aleatorio}>
              Aleatorio
            </Button>
            <Button variant="accent" icon={<Play20Filled />} onClick={() => reproducir(0)}>
              Reproducir
            </Button>
          </div>
        )
      }
      principal={
        !conectado ? (
          <InfoBar
            severity="info"
            title={estado === "connecting" ? "Conectando con Spotify…" : "Conecta tu cuenta de Spotify para ver tus canciones guardadas."}
            action={estado === "connecting" ? undefined : <Button onClick={conectarSpotify}>Conectar</Button>}
          >
            Necesitas Spotify Premium conectado en la sección Música.
          </InfoBar>
        ) : fallo === "permisos" || permisos === "faltan" ? (
          <AvisoPermisos texto="Para ver tus canciones guardadas, Spotify te pide tu permiso una sola vez. Regresas justo aquí." />
        ) : fallo === "error" ? (
          <InfoBar severity="warning" title="No se pudieron cargar tus canciones." action={<Button className="h-7" onClick={() => void cargarMas(0)}>Reintentar</Button>}>
            Comprueba tu conexión e inténtalo de nuevo.
          </InfoBar>
        ) : (
          <>
            {cargando && pistas.length === 0 && <p className="text-body text-fg-secondary" role="status">Cargando tus canciones…</p>}
            {!cargando && pistas.length === 0 && (
              <Card className="p-6">
                <p className="text-body text-fg">Aún no has guardado canciones.</p>
                <p className="mt-1 text-body text-fg-secondary">Pulsa el corazón de una canción mientras suena, o usa «Guardar en Me gusta» en su menú (los tres puntos).</p>
                <BotonEnlace href="/musica">Ir a Música</BotonEnlace>
              </Card>
            )}
            {pistas.length > 0 && (
              <Card className="overflow-hidden p-0">
                <ol aria-label="Canciones que te gustan">
                  {pistas.map((c, i) => (
                    <li key={c.id} className="group relative" onContextMenu={(e) => abrirMenuPista(e, c)}>
                      <button
                        type="button"
                        onClick={() => reproducir(i)}
                        aria-current={sonando === c.id ? "true" : undefined}
                        className={clsx(
                          "reveal grid h-14 w-full grid-cols-[40px_minmax(0,1fr)_56px] items-center gap-3 pl-4 pr-12 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt",
                          sonando === c.id && "bg-layer-alt",
                        )}
                      >
                        {c.caratula ? (
                          // eslint-disable-next-line @next/next/no-img-element -- carátula remota
                          <img src={c.caratula} alt="" width={40} height={40} className="h-10 w-10 rounded-[4px] object-cover" draggable={false} />
                        ) : (
                          <span className="h-10 w-10 rounded-[4px] bg-layer-alt" aria-hidden />
                        )}
                        <span className="min-w-0">
                          <span className={clsx("block truncate text-body", sonando === c.id ? "font-semibold text-accent-text" : "text-fg")}>{c.titulo}</span>
                          <span className="block truncate text-caption text-fg-secondary">{c.artista}</span>
                        </span>
                        <span className="tabular text-right text-caption text-fg-secondary">{formatDuration(c.duracion)}</span>
                      </button>
                      <IconButton label={`Más opciones de ${c.titulo}`} onClick={(e) => abrirMenuPista(e, c)} className="absolute right-2 top-3 opacity-0 focus-visible:opacity-100 group-hover:opacity-100">
                        <MoreHorizontal20Regular />
                      </IconButton>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
            {pistas.length > 0 && pistas.length < total && (
              <Button disabled={cargando} onClick={() => void cargarMas(pistas.length)} className="self-start">
                {cargando ? "Cargando…" : `Cargar más (${total - pistas.length} restantes)`}
              </Button>
            )}
          </>
        )
      }
    />
  );
}
