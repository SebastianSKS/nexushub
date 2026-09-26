"use client";

import { Selector } from "@/components/fluent/Selector";
import { Switch } from "@/components/fluent/Switch";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { textoDeHora } from "@/lib/silencio";
import { useAjustesStore } from "@/store/ajustes-store";

const HORAS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: textoDeHora(h) }));

/** «No molestar»: entre dos horas (puede cruzar la medianoche) Nexo no manda notificaciones del sistema ni suena. */
export function AjusteNoMolestar() {
  const t = useT();
  const activo = useAjustesStore((s) => s.silencioActivo);
  const desde = useAjustesStore((s) => s.silencioDesde);
  const hasta = useAjustesStore((s) => s.silencioHasta);
  const cambiar = useAjustesStore((s) => s.cambiar);

  return (
    <TarjetaAjuste
      glifo="campana"
      titulo={t("No molestar")}
      descripcion={activo ? t("Sin avisos ni sonidos de {desde} a {hasta}. Lo que pase mientras tanto no se repite después.", { desde: textoDeHora(desde), hasta: textoDeHora(hasta) }) : t("Elige unas horas (por ejemplo de noche) en las que Nexo no te avise ni suene.")}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        {activo && (
          <>
            <Selector<number> label={t("Desde")} value={desde} options={HORAS} onChange={(silencioDesde) => cambiar({ silencioDesde })} />
            <Selector<number> label={t("Hasta")} value={hasta} options={HORAS} onChange={(silencioHasta) => cambiar({ silencioHasta })} />
          </>
        )}
        <Switch checked={activo} onChange={(silencioActivo) => cambiar({ silencioActivo })} label={t("No molestar")} />
      </div>
    </TarjetaAjuste>
  );
}
