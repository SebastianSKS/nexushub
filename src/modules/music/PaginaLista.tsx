"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowShuffle20Regular, MoreHorizontal20Regular, Play20Filled } from "@fluentui/react-icons";
import { IconButton } from "@/components/fluent/IconButton";
import { abrirMenuPista } from "@/store/menu-pista-store";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { formatDuration } from "@/lib/video/format";
import { cargarLista, ErrorLista, ID_SPOTIFY, TIPOS_LISTA, type ListaSpotify, type TipoLista } from "@/services/music/lista";
import { infoPlaylist } from "@/services/music/biblioteca";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";
import { AccionesPlaylist } from "./AccionesPlaylist";

const ETIQUETA_TIPO: Record<TipoLista, string> = { playlist: "Playlist", album: "Álbum", artist: "Artista", track: "Canción" };

/** /musica/lista?id=&tipo= — el contenido de una playlist, álbum o artista. */
export function PaginaLista() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const tipoParam = params.get("tipo") ?? "playlist";
  const valido = ID_SPOTIFY.test(id) && TIPOS_LISTA.includes(tipoParam);
  const tipo = (valido ? tipoParam : "playlist") as TipoLista;

  const [lista, setLista] = useState<ListaSpotify | null>(null);
  const [error, setError] = useState<ErrorLista | null>(null);
  const [cargando, setCargando] = useState(valido);
  const [intento, setIntento] = useState(0);
  const sonando = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));
  const conectado = useMusicStore((s) => s.connection.status === "connected");
  // Si la playlist es tuya (o colaborativa), se puede renombrar, eliminar y quitarle canciones.
  const [propia, setPropia] = useState<{ nombre: string } | null>(null);

  useEffect(() => {
    setPropia(null);
    if (!valido || tipo !== "playlist" || !conectado) return;
    let cancelado = false;
    void infoPlaylist(id).then((i) => !cancelado && i?.editable && setPropia({ nombre: i.nombre }));
    return () => {
      cancelado = true;
    };
  }, [id, tipo, valido, conectado]);

  // Al quitar una canción desde su menú, la lista se vuelve a leer.
  useEffect(() => {
    const alCambiar = (e: Event) => (e as CustomEvent<string>).detail === id && setIntento((n) => n + 1);
    window.addEventListener("nexushub:playlist-cambiada", alCambiar);
    return () => window.removeEventListener("nexushub:playlist-cambiada", alCambiar);
  }, [id]);

  useEffect(() => {
    if (!valido) return;
    let cancelado = false;
    setCargando(true);
    setError(null);
    cargarLista(tipo, id)
      .then((l) => !cancelado && setLista(l))
      .catch((e: unknown) => !cancelado && setError(e instanceof ErrorLista ? e : new ErrorLista("No se pudo cargar la lista.", "Inténtalo de nuevo.")))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id, tipo, valido, intento]);

  const titulo = lista?.titulo ?? (valido ? "Cargando…" : "Lista no válida");
  const pistaContexto: Pista = { id: `${tipo}:${id}`, titulo: lista?.titulo ?? ETIQUETA_TIPO[tipo], artista: lista?.subtitulo ?? "Spotify", caratula: lista?.caratula ?? "", duracion: 0, fuente: "spotify" };
  // Con Spotify conectado, cada canción muestra SU carátula (la que trae Spotify al sonar), no la de la lista.
  const caratulaDe = () => (conectado ? "" : (lista?.caratula ?? ""));
  const pistaDeCancion = (c: ListaSpotify["canciones"][number]): Pista => ({ id: c.id, titulo: c.titulo, artista: c.artista, caratula: caratulaDe(), duracion: c.duracion, fuente: "spotify" });
  const reproducirCancion = (i: number) => {
    if (!lista) return;
    const pistas: Pista[] = lista.canciones.map(pistaDeCancion);
    useReproductorStore.getState().reproducir(pistas[i]!, pistas, i);
  };
  // Con las canciones a la vista, la lista entera pasa a la cola de NexusHub (siguiente, aleatorio, repetir…); si aún no
  // cargaron, se le da a Spotify el álbum o la playlist como contexto.
  const primera = lista ? lista.canciones.findIndex((c) => c.reproducible) : -1;
  const reproducirTodo = () => (primera >= 0 ? reproducirCancion(primera) : useReproductorStore.getState().reproducir(pistaContexto));
  const reproducirAleatorio = () => {
    if (!lista) return;
    const buenas = lista.canciones.map((c, i) => (c.reproducible ? i : -1)).filter((i) => i >= 0);
    if (buenas.length === 0) return;
    useReproductorStore.getState().setAleatorio(true);
    reproducirCancion(buenas[Math.floor(Math.random() * buenas.length)]!);
  };

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Música", href: "/musica" }, { etiqueta: titulo }]}
      titulo={titulo}
      descripcion={lista ? [ETIQUETA_TIPO[tipo], lista.subtitulo, lista.canciones.length > 0 ? `${lista.canciones.length} canciones` : ""].filter(Boolean).join(" · ") : ETIQUETA_TIPO[tipo]}
      accion={
        valido && (
          <div className="flex flex-wrap justify-end gap-2">
            {propia && <AccionesPlaylist id={id} nombre={propia.nombre} onRenombrada={(n) => setLista((l) => (l ? { ...l, titulo: n } : l))} />}
            {primera >= 0 && (
              <Button icon={<ArrowShuffle20Regular />} onClick={reproducirAleatorio}>
                Aleatorio
              </Button>
            )}
            <Button variant="accent" icon={<Play20Filled />} onClick={reproducirTodo}>
              Reproducir
            </Button>
          </div>
        )
      }
      principal={
        !valido ? (
          <InfoBar severity="error" title="Este enlace no lleva a una lista de Spotify." action={<BotonEnlace href="/musica">Ir a Música</BotonEnlace>}>
            Falta el identificador de la lista o no es válido.
          </InfoBar>
        ) : (
          <>
            {error && (
              <InfoBar severity="warning" title={error.message} action={<Button className="h-7" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>}>
                {error.pista}
              </InfoBar>
            )}
            {cargando && !lista && <p className="text-body text-fg-secondary" role="status">Cargando las canciones…</p>}
            {lista && lista.canciones.length > 0 && (
              <Card className="overflow-hidden p-0">
                <ol aria-label="Canciones">
                  {lista.canciones.map((c, i) => (
                    <li key={`${c.id}-${i}`} className="group relative" onContextMenu={(e) => abrirMenuPista(e, pistaDeCancion(c), propia ? { playlistId: id } : undefined)}>
                      <button
                        type="button"
                        onClick={() => reproducirCancion(i)}
                        disabled={!c.reproducible}
                        aria-current={sonando === c.id ? "true" : undefined}
                        className={clsx(
                          "reveal grid h-12 w-full grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3 pl-4 pr-12 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt disabled:opacity-40",
                          sonando === c.id && "bg-layer-alt",
                        )}
                      >
                        <span className="tabular text-caption text-fg-tertiary">{i + 1}</span>
                        <span className="min-w-0">
                          <span className={clsx("block truncate text-body", sonando === c.id ? "font-semibold text-accent-text" : "text-fg")}>{c.titulo}</span>
                          <span className="block truncate text-caption text-fg-secondary">{c.artista}</span>
                        </span>
                        <span className="tabular text-right text-caption text-fg-secondary">{formatDuration(c.duracion)}</span>
                      </button>
                      <IconButton label={`Más opciones de ${c.titulo}`} onClick={(e) => abrirMenuPista(e, pistaDeCancion(c), propia ? { playlistId: id } : undefined)} className="absolute right-2 top-2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100">
                        <MoreHorizontal20Regular />
                      </IconButton>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </>
        )
      }
      lateral={
        lista?.caratula ? (
          <Card className="p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- carátula remota de Spotify */}
            <img src={lista.caratula} alt="" className="aspect-square w-full rounded-input object-cover shadow-card" />
          </Card>
        ) : undefined
      }
    />
  );
}
