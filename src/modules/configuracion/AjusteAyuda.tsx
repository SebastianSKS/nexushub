"use client";

import { useState } from "react";
import { Button } from "@/components/fluent/Button";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { abrirReporte, copiarTexto, diagnosticoDeAhora, REPOSITORIO } from "@/lib/diagnostico-app";
import { abrirExterno } from "@/lib/entorno";
import { useT } from "@/lib/i18n";

/** «Ayuda»: avisar de un problema (GitHub, con la información técnica ya puesta y sin datos personales) o copiar esa información. */
export function AjusteAyuda() {
  const t = useT();
  const [aviso, setAviso] = useState<string | null>(null);

  const copiar = async () => {
    const ok = await copiarTexto(await diagnosticoDeAhora());
    setAviso(ok ? t("Copiado. Pégalo en tu mensaje.") : t("No se pudo copiar."));
  };

  return (
    <TarjetaAjuste
      glifo="informacion"
      titulo={t("¿Algo no funciona?")}
      descripcion={aviso ?? t("Cuéntanos qué pasó. El aviso lleva la versión y tu sistema, nunca tus archivos, calendario ni nombre.")}
    >
      <Button onClick={() => void copiar()}>{t("Copiar información técnica")}</Button>
      <Button onClick={async () => void abrirReporte(await diagnosticoDeAhora())}>{t("Avisar del problema")}</Button>
      <Button variant="subtle" onClick={() => void abrirExterno(`https://github.com/${REPOSITORIO}/releases`)}>
        {t("Ver versiones")}
      </Button>
    </TarjetaAjuste>
  );
}
