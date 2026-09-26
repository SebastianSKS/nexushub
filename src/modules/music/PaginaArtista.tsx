"use client";

import { useT, T } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowShuffle20Regular, MoreHorizontal20Regular, Play20Filled, Headphones20Regular } from "@fluentui/react-icons";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { IconButton } from "@/components/fluent/IconButton";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { formatDuration } from "@/lib/video/format";
import { cargarArtista, cargarDiscografia, seguirArtista, sigoAlArtista, type DatosArtista } from "@/services/music/artista";
import { ErrorLista } from "@/services/music/lista";
import { avisoBreve } from "@/services/music/megusta";
import { pedirPermisoSpotify } from "@/services/music/permisos";
import { abrirMenuPista } from "@/store/menu-pista-store";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";
import type { MusicItem } from "@/types/music";
import { MusicCard } from "./MusicCard";

const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4";

function Discografia({ titulo, items, hayMas, cargando, onMas }: { titulo: string; items: MusicItem[]; hayMas: boolean; cargando: boolean; onMas: () => void }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <section aria-label={t(titulo)}>
      <h2 className="mb-3 text-subtitle text-fg">{t(titulo)}</h2>
      <div className={GRID}>
        {items.map((a) => (
          <MusicCard key={a.id} item={a} active={false} onPlay={() => undefined} />
        ))}
      </div>
      {hayMas && (
        <Button className="mt-3" disabled={cargando} onClick={onMas}>
          {cargando ? t("Cargando…") : t("Ver más")}
        </Button>
      )}
    </section>
  );
}

/** /musica/artista?id= — foto y nombre, lo más escuchado, discografía y «Seguir». */
export function PaginaArtista() {
  const t = useT();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const valido = ID_SPOTIFY.test(id);
  const conectado = useMusicStore((s) => s.connection.status === "connected");
  const permisos = useMusicStore((s) => s.permisosBiblioteca);
  const sonando = useReproductorStore((s) => (s.fuente === "spotify" ? s.pista?.id : undefined));

  const [datos, setDatos] = useState<DatosArtista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(valido);
  const [intento, setIntento] = useState(0);
  const [sigo, setSigo] = useState<boolean | null>(null);
  const [albumes, setAlbumes] = useState<{ items: MusicItem[]; hayMas: boolean; cargando: boolean }>({ items: [], hayMas: false, cargando: false });
  const [sencillos, setSencillos] = useState<{ items: MusicItem[]; hayMas: boolean; cargando: boolean }>({ items: [], hayMas: false, cargando: false });

  useEffect(() => {
    if (!valido) return;
    let cancelado = false;
    setCargando(true);
    setError(null);
    setDatos(null);
    cargarArtista(id)
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        if (useMusicStore.getState().connection.status === "connected") {
          void cargarDiscografia(id, d.nombre, "album").then((r) => !cancelado && setAlbumes({ ...r, cargando: false }));
          void cargarDiscografia(id, d.nombre, "single").then((r) => !cancelado && setSencillos({ ...r, cargando: false }));
        }
      })
      .catch((e: unknown) => !cancelado && setError(e instanceof ErrorLista ? e.message : t("No se pudo cargar al artista.")))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id, valido, intento, conectado]);

  useEffect(() => {
    setSigo(null);
    if (valido && conectado) void sigoAlArtista(id).then(setSigo);
  }, [id, valido, conectado]);

  const masDe = async (grupo: "album" | "single") => {
    if (!datos) return;
    const [actual, poner] = grupo === "album" ? [albumes, setAlbumes] : [sencillos, setSencillos];
    poner({ ...actual, cargando: true });
    const r = await cargarDiscografia(id, datos.nombre, grupo, actual.items.length);
    poner({ items: [...actual.items, ...r.items], hayMas: r.hayMas, cargando: false });
  };

  const alternarSeguir = async () => {
    if (permisos === "faltan") return pedirPermisoSpotify(T("seguir artistas"));
    if (sigo === null) return;
    const quiere = !sigo;
    const r = await seguirArtista(id, quiere);
    if (r === "ok") {
      setSigo(quiere);
      avisoBreve(quiere ? t("Ahora sigues a") : t("Dejaste de seguir a"), datos?.nombre);
    } else if (r === "permisos") pedirPermisoSpotify(T("seguir artistas"));
    else avisoBreve(t("No se pudo actualizar"), t("Inténtalo de nuevo en un momento."));
  };

  const populares = datos?.populares ?? [];
  const reproducir = (i: number) => useReproductorStore.getState().reproducir(populares[i]!, populares, i);
  const aleatorio = () => {
    if (populares.length === 0) return;
    useReproductorStore.getState().setAleatorio(true);
    reproducir(Math.floor(Math.random() * populares.length));
  };
  // La «radio del artista»: se empieza por su canción más escuchada y la música sigue sola con canciones parecidas.
  const radio = () => populares[0] && useReproductorStore.getState().reproducir(populares[0]);

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Música", href: "/musica" }, { etiqueta: datos?.nombre ?? t("Artista") }]}
      titulo={datos?.nombre ?? (valido ? (cargando ? t("Cargando…") : t("Artista")) : t("Artista no válido"))}
      descripcion={t("Artista")}
      accion={
        datos && (
          <div className="flex flex-wrap justify-end gap-2">
            {conectado && (sigo !== null || permisos === "faltan") && (
              <Button onClick={() => void alternarSeguir()} aria-pressed={sigo === true}>
                {sigo ? t("Siguiendo") : t("Seguir")}
              </Button>
            )}
            {populares.length > 0 && (
              <>
                <Button icon={<Headphones20Regular />} onClick={radio}>
                  {t("Radio")}
                </Button>
                <Button icon={<ArrowShuffle20Regular />} onClick={aleatorio}>
                  {t("Aleatorio")}
                </Button>
                <Button variant="accent" icon={<Play20Filled />} onClick={() => reproducir(0)}>
                  {t("Reproducir")}
                </Button>
              </>
            )}
          </div>
        )
      }
      principal={
        !valido ? (
          <InfoBar severity="error" title={t("Este enlace no lleva a un artista de Spotify.")} action={<BotonEnlace href="/musica">{t("Ir a Música")}</BotonEnlace>}>
            {t("Falta el identificador del artista o no es válido.")}
          </InfoBar>
        ) : error ? (
          <InfoBar severity="warning" title={error} action={<Button className="h-7" onClick={() => setIntento((n) => n + 1)}>{t("Reintentar")}</Button>}>
            {t("Comprueba tu conexión e inténtalo de nuevo.")}
          </InfoBar>
        ) : (
          <div className="flex flex-col gap-8">
            {cargando && !datos && <p className="text-body text-fg-secondary" role="status">{t("Cargando al artista…")}</p>}
            {populares.length > 0 && (
              <section aria-label={t("Populares")}>
                <h2 className="mb-3 text-subtitle text-fg">{t("Populares")}</h2>
                <ol className="overflow-hidden rounded-control border border-stroke bg-layer">
                  {populares.map((c, i) => (
                    <li key={`${c.id}-${i}`} className="group relative" onContextMenu={(e) => abrirMenuPista(e, c, { artistId: id })}>
                      <button
                        type="button"
                        onClick={() => reproducir(i)}
                        aria-current={sonando === c.id ? "true" : undefined}
                        className={clsx("grid h-12 w-full grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3 pl-4 pr-12 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt", sonando === c.id && "bg-layer-alt")}
                      >
                        <span className="tabular text-caption text-fg-tertiary">{i + 1}</span>
                        <span className={clsx("truncate text-body", sonando === c.id ? "font-semibold text-accent-text" : "text-fg")}>{c.titulo}</span>
                        <span className="tabular text-right text-caption text-fg-secondary">{formatDuration(c.duracion)}</span>
                      </button>
                      <IconButton label={t("Más opciones de {titulo}", { titulo: c.titulo })} onClick={(e) => abrirMenuPista(e, c as Pista, { artistId: id })} className="absolute right-2 top-2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100">
                        <MoreHorizontal20Regular />
                      </IconButton>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <Discografia titulo={T("Álbumes")} items={albumes.items} hayMas={albumes.hayMas} cargando={albumes.cargando} onMas={() => void masDe("album")} />
            <Discografia titulo={T("Sencillos y EP")} items={sencillos.items} hayMas={sencillos.hayMas} cargando={sencillos.cargando} onMas={() => void masDe("single")} />
            {datos && populares.length === 0 && albumes.items.length === 0 && !cargando && <p className="text-body text-fg-secondary">{t("No encontré canciones de este artista.")}</p>}
          </div>
        )
      }
      lateral={
        datos?.imagen ? (
          <div className="overflow-hidden rounded-control border border-stroke bg-layer p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto remota de Spotify */}
            <img src={datos.imagen} alt="" className="aspect-square w-full rounded-full object-cover shadow-card" />
          </div>
        ) : undefined
      }
    />
  );
}
