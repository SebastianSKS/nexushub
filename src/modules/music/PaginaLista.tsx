"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Play20Filled } from "@fluentui/react-icons";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { formatDuration } from "@/lib/video/format";
import { cargarLista, ErrorLista, ID_SPOTIFY, TIPOS_LISTA, type ListaSpotify, type TipoLista } from "@/services/music/lista";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

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
  const reproducirTodo = () => useReproductorStore.getState().reproducir(pistaContexto);
  const reproducirCancion = (i: number) => {
    if (!lista) return;
    const pistas: Pista[] = lista.canciones.map((c) => ({ id: c.id, titulo: c.titulo, artista: c.artista, caratula: lista.caratula, duracion: c.duracion, fuente: "spotify" }));
    useReproductorStore.getState().reproducir(pistas[i]!, pistas, i);
  };

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Música", href: "/musica" }, { etiqueta: titulo }]}
      titulo={titulo}
      descripcion={lista ? [ETIQUETA_TIPO[tipo], lista.subtitulo, lista.canciones.length > 0 ? `${lista.canciones.length} canciones` : ""].filter(Boolean).join(" · ") : ETIQUETA_TIPO[tipo]}
      accion={
        valido && (
          <Button variant="accent" icon={<Play20Filled />} onClick={reproducirTodo}>
            Reproducir
          </Button>
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
                    <li key={`${c.id}-${i}`}>
                      <button
                        type="button"
                        onClick={() => reproducirCancion(i)}
                        disabled={!c.reproducible}
                        aria-current={sonando === c.id ? "true" : undefined}
                        className={clsx(
                          "reveal grid h-12 w-full grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3 px-4 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt disabled:opacity-40",
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
