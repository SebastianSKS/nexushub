"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Add20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { useCanalesStore } from "@/store/canales-store";
import { AgregarCanalDialog } from "./AgregarCanalDialog";
import { BuscadorVideos } from "./BuscadorVideos";
import { FavoritosVideo } from "./FavoritosVideo";
import { MuroVideos } from "./MuroVideos";
import { PanelCanales } from "./PanelCanales";

// El panel de desarrollo solo se importa fuera de producción: en `next build` esta condición vale
// `false` y el bundler descarta el import.
export const PanelDev =
  process.env.NODE_ENV !== "production"
    ? dynamic(() => import("./dev/PanelDev").then((m) => m.PanelDev), { ssr: false })
    : null;

/** /video — Novedades de todos los canales que sigues. */
export function PaginaVideo() {
  const t = useT();
  const canales = useCanalesStore((s) => s.canales);
  const [dialogo, setDialogo] = useState(false);
  const [dev, setDev] = useState(false);

  useEffect(() => {
    useCanalesStore.getState().iniciar();
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");
  }, []);

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Video" }]}
        titulo={t("Video")}
        descripcion={t("Tu propio muro: las novedades de los canales de YouTube que sigues.")}
        accion={
          <Button variant="accent" icon={<Add20Regular />} onClick={() => setDialogo(true)}>
            {t("Agregar canal")}
          </Button>
        }
        principal={
          <>
            <BuscadorVideos />
            <FavoritosVideo />
            <MuroVideos ids={canales.map((c) => c.id)} titulo={t("Novedades de tus canales")} />
          </>
        }
        lateral={<PanelCanales />}
      />
      <AgregarCanalDialog abierto={dialogo} onCerrar={() => setDialogo(false)} />
      {PanelDev && dev && <PanelDev />}
    </>
  );
}
