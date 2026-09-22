"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowSync20Regular } from "@fluentui/react-icons";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { Button } from "@/components/fluent/Button";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { useCanalesStore } from "@/store/canales-store";
import { BuscadorVideos } from "./BuscadorVideos";
import { MuroVideos } from "./MuroVideos";
import { PanelCanales } from "./PanelCanales";

/** /video/canal?id= — los videos de un solo canal. */
export function PaginaCanal() {
  const id = useSearchParams().get("id") ?? "";
  const iniciado = useCanalesStore((s) => s.iniciado);
  const canal = useCanalesStore((s) => s.canales.find((c) => c.id === id));
  const cantidad = useCanalesStore((s) => s.feeds[id]?.videos.length ?? 0);
  const cargando = useCanalesStore((s) => s.feeds[id]?.estado === "cargando");

  useEffect(() => {
    useCanalesStore.getState().iniciar();
  }, []);

  const noSeguido = iniciado && !canal;

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Video", href: "/video" }, { etiqueta: canal?.nombre ?? "Canal" }]}
      titulo={canal?.nombre ?? "Canal"}
      descripcion={canal ? `${cantidad} ${cantidad === 1 ? "video reciente" : "videos recientes"} de este ${canal.tipo === "lista" ? "listado" : "canal"}.` : "Videos de un canal de YouTube."}
      accion={
        canal && (
          <Button variant="accent" icon={<ArrowSync20Regular />} disabled={cargando} onClick={() => void useCanalesStore.getState().cargarFeed(id, { fresco: true })}>
            {cargando ? "Actualizando…" : "Actualizar canal"}
          </Button>
        )
      }
      principal={
        noSeguido ? (
          <InfoBar severity="warning" title="No sigues este canal." action={<BotonEnlace href="/video">Ver mis canales</BotonEnlace>}>
            El enlace apunta a un canal que no está en tu lista. Puede que lo quitaras, o que el enlace venga de otra copia de NexusHub.
          </InfoBar>
        ) : (
          <>
            <BuscadorVideos />
            <MuroVideos ids={[id]} titulo={canal?.nombre ?? "Canal"} />
          </>
        )
      }
      lateral={<PanelCanales />}
    />
  );
}
