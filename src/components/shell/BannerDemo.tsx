"use client";

import { useState } from "react";
import { ES_DEMO, reiniciarDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n";

const DESCARGA = "https://github.com/SebastianSKS/nexushub/releases/latest";

/**
 * Franja fina que solo sale en la demo publicada en la web: avisa de que son datos de ejemplo y de qué cosas solo existen en la
 * aplicación de Windows. Se puede cerrar (durante la visita) y «Restablecer» deja la demo como el primer día.
 */
export function BannerDemo() {
  const t = useT();
  const [oculto, setOculto] = useState(false);
  if (!ES_DEMO || oculto) return null;
  return (
    <div role="note" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-stroke bg-layer-alt px-4 py-1.5 text-caption text-fg-secondary">
      <p className="min-w-0 flex-1">
        <strong className="font-semibold text-fg">{t("Estás probando Nexo en el navegador, con datos de ejemplo.")}</strong>{" "}
        {t("Los avisos del sistema, las carpetas de tus materias y la búsqueda dentro de tus archivos solo existen en la aplicación para Windows.")}
      </p>
      <a className="font-semibold text-accent-text underline underline-offset-2" href={DESCARGA} target="_blank" rel="noopener noreferrer">
        {t("Descargar Nexo")}
      </a>
      <button
        type="button"
        className="underline underline-offset-2"
        onClick={() => {
          reiniciarDemo(window.localStorage);
          window.location.reload();
        }}
      >
        {t("Restablecer datos")}
      </button>
      <button type="button" className="underline underline-offset-2" onClick={() => setOculto(true)}>
        {t("Cerrar aviso")}
      </button>
    </div>
  );
}
