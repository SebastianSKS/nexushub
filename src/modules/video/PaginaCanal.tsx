"use client";

import { useT } from "@/lib/i18n";
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
  const t = useT();
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
      migas={[{ etiqueta: "Video", href: "/video" }, { etiqueta: canal?.nombre ?? t("Canal") }]}
      titulo={canal?.nombre ?? t("Canal")}
      descripcion={canal ? t("{cantidad} {videos} de este {tipo}.", { cantidad, videos: cantidad === 1 ? t("video reciente") : t("videos recientes"), tipo: canal.tipo === "lista" ? t("listado") : t("canal") }) : t("Videos de un canal de YouTube.")}
      accion={
        canal && (
          <Button variant="accent" icon={<ArrowSync20Regular />} disabled={cargando} onClick={() => void useCanalesStore.getState().cargarFeed(id, { fresco: true })}>
            {cargando ? t("Actualizando…") : t("Actualizar canal")}
          </Button>
        )
      }
      principal={
        noSeguido ? (
          <InfoBar severity="warning" title={t("No sigues este canal.")} action={<BotonEnlace href="/video">{t("Ver mis canales")}</BotonEnlace>}>
            {t("El enlace apunta a un canal que no está en tu lista. Puede que lo quitaras, o que el enlace venga de otra copia de Nexo.")}
          </InfoBar>
        ) : (
          <>
            <BuscadorVideos />
            <MuroVideos ids={[id]} titulo={canal?.nombre ?? t("Canal")} />
          </>
        )
      }
      lateral={<PanelCanales />}
    />
  );
}
