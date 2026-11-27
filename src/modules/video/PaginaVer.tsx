"use client";

import { useT, traducir } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Next20Regular, Open20Regular, Previous20Regular } from "@fluentui/react-icons";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { InfoBar } from "@/components/fluent/InfoBar";
import { Selector } from "@/components/fluent/Selector";
import { HuecoReproductor } from "@/components/reproductor/HuecoReproductor";
import { useColoresCaratula } from "@/hooks/useColoresCaratula";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { fechaRelativa } from "@/lib/canales/fecha";
import { pistaDeVideo } from "@/lib/canales/pistas";
import { rutaCanal, rutaVer } from "@/lib/rutas";
import { abrirExterno } from "@/lib/entorno";
import { fetchExterno } from "@/lib/red";
import { formatDuration } from "@/lib/video/format";
import { obtenerReproductor } from "@/services/canales/youtube-iframe";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCanalesStore } from "@/store/canales-store";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useProgresoVideoStore, VELOCIDADES } from "@/store/progreso-video-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";
import type { VideoCanal } from "@/types/canal";
import { AvatarCanal } from "./AvatarCanal";
import { ColaVideos } from "./ColaVideos";
import { PanelDev } from "./PaginaVideo";

const ID_VIDEO = /^[\w-]{11}$/;

/** Título y autor de un video de YouTube que no está en ninguno de tus canales (oEmbed, sin clave). */
async function metadatosDe(id: string): Promise<{ titulo: string; artista: string; caratula: string }> {
  const respaldo = { titulo: traducir("Video de YouTube"), artista: "YouTube", caratula: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
    const res = await fetchExterno(url, { cache: "no-store" });
    if (!res.ok) return respaldo;
    const d = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
    return { titulo: d.title ?? respaldo.titulo, artista: d.author_name ?? respaldo.artista, caratula: d.thumbnail_url ?? respaldo.caratula };
  } catch {
    return respaldo;
  }
}

/** /video/ver?id= — el video, en el «hueco» de la página. El reproductor real vive en la raíz. */
export function PaginaVer() {
  const t = useT();
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const valido = ID_VIDEO.test(id);
  const [dev, setDev] = useState(false);

  const pista = useReproductorStore((s) => (s.fuente === "youtube" && s.pista?.id === id ? s.pista : null));
  const error = useReproductorStore((s) => (s.fuente === "youtube" && s.pista?.id === id ? s.error : null));
  const hayCola = useReproductorStore((s) => s.cola.length > 1);
  const feeds = useCanalesStore((s) => s.feeds);
  const video: VideoCanal | undefined = Object.values(feeds)
    .flatMap((f) => f.videos)
    .find((v) => v.videoId === id);
  const favorito = useFavoritosStore((s) => valido && s.favoritos.some((f) => f.id === id && f.fuente === "youtube"));
  const velocidad = useProgresoVideoStore((s) => s.velocidad);
  // Desde dónde se retoma este video: se lee una sola vez al abrirlo (luego el progreso cambia sin parar).
  const retomadoEn = useMemo(() => (valido ? useProgresoVideoStore.getState().inicioDe(id) : 0), [id, valido]);
  const [empezoDeCero, setEmpezoDeCero] = useState(false);
  useEffect(() => setEmpezoDeCero(false), [id]);

  useEffect(() => {
    useCanalesStore.getState().iniciar();
    useFavoritosStore.getState().cargar();
    useProgresoVideoStore.getState().cargar();
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");
  }, []);

  // La URL manda: si el video de la dirección no es el que está cargado, se carga.
  // (Si ya es el que suena —por ejemplo al volver desde la miniatura— no se toca: sigue en el mismo segundo.)
  useEffect(() => {
    if (!valido) return;
    const rep = useReproductorStore.getState();
    if (rep.fuente === "youtube" && rep.pista?.id === id) return;
    let cancelado = false;
    const auto = useAjustesStore.getState().reproduccionAutomatica;
    const { feeds: f, duraciones } = useCanalesStore.getState();
    const enFeed = Object.values(f).flatMap((x) => x.videos).find((v) => v.videoId === id);

    const cargar = (p: Pista, cola?: Pista[]) => {
      if (!cancelado) useReproductorStore.getState().reproducir(p, cola, undefined, { reproducir: auto });
    };
    if (enFeed) {
      const delCanal = (f[enFeed.canalId]?.videos ?? [enFeed]).map((v) => pistaDeVideo(v, duraciones));
      cargar(pistaDeVideo(enFeed, duraciones), delCanal);
    } else {
      void metadatosDe(id).then((m) => cargar({ id, ...m, duracion: duraciones[id] ?? 0, fuente: "youtube" }));
    }
    return () => {
      cancelado = true;
    };
  }, [id, valido]);

  // Si el video cambia solo (la cola avanza, o eliges otro de la lista), la dirección lo sigue: así el título,
  // los favoritos y «Abrir en YouTube» siempre hablan del video que se está viendo.
  useEffect(() => {
    if (!valido) return;
    return useReproductorStore.subscribe((s, previo) => {
      if (s.fuente !== "youtube" || !s.pista || s.pista.id === previo.pista?.id) return;
      if (s.pista.id !== new URLSearchParams(window.location.search).get("id")) router.replace(rutaVer(s.pista.id), { scroll: false });
    });
  }, [valido, router]);

  const titulo = pista?.titulo ?? (valido ? t("Cargando video…") : t("Video no válido"));
  const canalCrumb = video ? [{ etiqueta: video.canalNombre, href: rutaCanal(video.canalId) }] : [];
  const descripcion = pista ? [pista.artista, video ? fechaRelativa(video.publicado) : ""].filter(Boolean).join(" · ") : "";
  const urlYouTube = `https://www.youtube.com/watch?v=${id}`;
  const pistaFavorito: Pista | null = pista ?? (video ? pistaDeVideo(video, {}) : null);
  const avatar = useCanalesStore((s) => s.canales.find((c) => c.id === video?.canalId)?.avatar ?? null);
  // El resplandor alrededor del video, con los colores de su miniatura (se apaga junto con «Fondo según la música»).
  const resplandor = useAjustesStore((s) => s.fondoMusical);
  const colores = useColoresCaratula(resplandor ? (pista?.caratula ?? video?.miniatura ?? "") : "");
  const canal = pista?.artista ?? video?.canalNombre ?? "";

  const datosCanal = (
    <>
      <AvatarCanal nombre={canal || "?"} avatar={avatar} tam={40} />
      <span className="min-w-0">
        <span className="block truncate text-body font-semibold text-fg">{canal}</span>
        <span className="block truncate text-caption text-fg-secondary">{video ? fechaRelativa(video.publicado) : "YouTube"}</span>
      </span>
    </>
  );

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Video", href: "/video" }, ...canalCrumb, { etiqueta: titulo }]}
        titulo={titulo}
        descripcion={descripcion || t("Reproductor de video")}
        sinCabecera={valido}
        principal={
          !valido ? (
            <InfoBar severity="error" title={t("Este enlace no lleva a un video.")} action={<BotonEnlace href="/video">{t("Ir a Video")}</BotonEnlace>}>
              {t("Falta el identificador del video o no es válido (debe tener 11 caracteres).")}
            </InfoBar>
          ) : (
            <div className="mx-auto flex w-full max-w-[calc((100vh-290px)*16/9)] flex-col gap-4">
              {/* El video de verdad se dibuja encima del hueco; el resplandor es la sombra del hueco, que asoma alrededor. */}
              <div
                className="rounded-control transition-shadow duration-[1200ms] ease-fluent"
                style={colores ? { boxShadow: `0 22px 70px -18px rgb(${colores[0].join(" ")} / 0.75), 0 0 80px -26px rgb(${colores[1].join(" ")} / 0.7), 0 -10px 60px -30px rgb(${colores[2].join(" ")} / 0.6)` } : undefined}
              >
                <HuecoReproductor />
              </div>

              <h1 className="mt-1 text-subtitle text-fg">{titulo}</h1>

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                {video ? (
                  <Link href={rutaCanal(video.canalId)} className="rounded-control -m-1 flex min-w-0 items-center gap-3 p-1 pr-3 transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                    {datosCanal}
                  </Link>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">{canal && datosCanal}</div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {hayCola && (
                    <div className="flex">
                      <IconButton label={t("Anterior")} onClick={() => useReproductorStore.getState().anterior()}>
                        <Previous20Regular />
                      </IconButton>
                      <IconButton label={t("Siguiente")} onClick={() => useReproductorStore.getState().siguiente()}>
                        <Next20Regular />
                      </IconButton>
                    </div>
                  )}
                  <Selector<number>
                    label={t("Velocidad de reproducción")}
                    value={velocidad}
                    options={VELOCIDADES.map((v) => ({ value: v, label: v === 1 ? t("Velocidad normal") : `${v}×` }))}
                    onChange={(v) => {
                      useProgresoVideoStore.getState().setVelocidad(v);
                      obtenerReproductor()?.setPlaybackRate(v);
                    }}
                    className="w-[168px]"
                  />
                  <Button
                    icon={<Glifo nombre={favorito ? "favoritoLleno" : "favorito"} />}
                    disabled={!pistaFavorito}
                    onClick={() => pistaFavorito && useFavoritosStore.getState().alternarFavorito(pistaFavorito)}
                  >
                    {favorito ? t("En favoritos") : t("Añadir a favoritos")}
                  </Button>
                  <Button icon={<Open20Regular />} onClick={() => void abrirExterno(urlYouTube)}>
                    {t("Abrir en YouTube")}
                  </Button>
                </div>
              </div>

              {retomadoEn > 0 && !empezoDeCero && (
                <p className="flex flex-wrap items-center gap-2 text-body text-fg-secondary">
                  {t("Retomaste desde {tiempo}.", { tiempo: formatDuration(retomadoEn) })}
                  <Button
                    variant="subtle"
                    className="h-7"
                    onClick={() => {
                      obtenerReproductor()?.seekTo(0, true);
                      useProgresoVideoStore.getState().olvidar(id);
                      setEmpezoDeCero(true);
                    }}
                  >
                    {t("Empezar de nuevo")}
                  </Button>
                </p>
              )}
              {error && (
                <InfoBar
                  severity="error"
                  title={error}
                  action={
                    hayCola ? (
                      <Button className="h-7" onClick={() => useReproductorStore.getState().siguiente()}>
                        {t("Saltar al siguiente")}
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </div>
          )
        }
        lateral={valido ? <ColaVideos /> : undefined}
      />
      {PanelDev && dev && <PanelDev />}
    </>
  );
}
