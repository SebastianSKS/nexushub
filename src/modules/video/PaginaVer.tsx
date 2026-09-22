"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Next20Regular, Previous20Regular } from "@fluentui/react-icons";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { InfoBar } from "@/components/fluent/InfoBar";
import { HuecoReproductor } from "@/components/reproductor/HuecoReproductor";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { fechaRelativa } from "@/lib/canales/fecha";
import { pistaDeVideo } from "@/lib/canales/pistas";
import { rutaCanal } from "@/lib/rutas";
import { abrirExterno } from "@/lib/entorno";
import { fetchExterno } from "@/lib/red";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCanalesStore } from "@/store/canales-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";
import type { VideoCanal } from "@/types/canal";
import { ColaVideos } from "./ColaVideos";
import { PanelDev } from "./PaginaVideo";

const ID_VIDEO = /^[\w-]{11}$/;

/** Título y autor de un video de YouTube que no está en ninguno de tus canales (oEmbed, sin clave). */
async function metadatosDe(id: string): Promise<{ titulo: string; artista: string; caratula: string }> {
  const respaldo = { titulo: "Video de YouTube", artista: "YouTube", caratula: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
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

  useEffect(() => {
    useCanalesStore.getState().iniciar();
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

  const titulo = pista?.titulo ?? (valido ? "Cargando video…" : "Video no válido");
  const canalCrumb = video ? [{ etiqueta: video.canalNombre, href: rutaCanal(video.canalId) }] : [];
  const descripcion = pista ? [pista.artista, video ? fechaRelativa(video.publicado) : ""].filter(Boolean).join(" · ") : "";
  const urlYouTube = `https://www.youtube.com/watch?v=${id}`;

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Video", href: "/video" }, ...canalCrumb, { etiqueta: titulo }]}
        titulo={titulo}
        descripcion={descripcion || "Reproductor de video"}
        accion={
          valido && (
            <Button variant="accent" onClick={() => void abrirExterno(urlYouTube)}>
              Abrir en YouTube
            </Button>
          )
        }
        principal={
          !valido ? (
            <InfoBar severity="error" title="Este enlace no lleva a un video." action={<BotonEnlace href="/video">Ir a Video</BotonEnlace>}>
              Falta el identificador del video o no es válido (debe tener 11 caracteres).
            </InfoBar>
          ) : (
            <>
              <div className="mx-auto w-full max-w-[calc((100vh-300px)*16/9)]">
                <HuecoReproductor />
              </div>
              {error && (
                <InfoBar
                  severity="error"
                  title={error}
                  action={
                    hayCola ? (
                      <Button className="h-7" onClick={() => useReproductorStore.getState().siguiente()}>
                        Saltar al siguiente
                      </Button>
                    ) : undefined
                  }
                />
              )}
              {hayCola && (
                <div className="flex gap-2">
                  <Button icon={<Previous20Regular />} onClick={() => useReproductorStore.getState().anterior()}>
                    Anterior
                  </Button>
                  <Button icon={<Next20Regular />} onClick={() => useReproductorStore.getState().siguiente()}>
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )
        }
        lateral={valido ? <ColaVideos /> : undefined}
      />
      {PanelDev && dev && <PanelDev />}
    </>
  );
}
