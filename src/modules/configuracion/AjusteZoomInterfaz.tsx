"use client";

import { Selector } from "@/components/fluent/Selector";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { useT } from "@/lib/i18n";
import { useAjustesStore, ZOOMS_INTERFAZ } from "@/store/ajustes-store";

/** «Tamaño de la interfaz»: 90 % a 150 % para toda la ventana (más grande si lees de lejos, más chica para ver más). Solo en escritorio. */
export function AjusteZoomInterfaz() {
  const t = useT();
  const escritorio = useEsEscritorio();
  const zoom = useAjustesStore((s) => s.zoomInterfaz);
  const cambiar = useAjustesStore((s) => s.cambiar);
  if (!escritorio) return null;
  return (
    <TarjetaAjuste glifo="pantalla" titulo={t("Tamaño de la interfaz")} descripcion={t("Agranda o achica todo Nexo: textos, botones y cuadros.")}>
      <Selector<number>
        label={t("Tamaño de la interfaz")}
        value={zoom}
        options={ZOOMS_INTERFAZ.map((z) => ({ value: z, label: z === 100 ? t("100 % (normal)") : `${z} %` }))}
        onChange={(zoomInterfaz) => cambiar({ zoomInterfaz })}
      />
    </TarjetaAjuste>
  );
}
