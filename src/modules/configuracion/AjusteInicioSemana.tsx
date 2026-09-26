"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { useAjustesStore, type PrimerDiaSemana } from "@/store/ajustes-store";

/** «La semana empieza el»: lunes o domingo, para la cuadrícula del mes y la agenda del Calendario. */
export function AjusteInicioSemana() {
  const t = useT();
  const primer = useAjustesStore((s) => s.primerDiaSemana);
  const cambiar = useAjustesStore((s) => s.cambiar);
  return (
    <TarjetaAjuste glifo="calendario" titulo={t("La semana empieza el")} descripcion={t("El primer día de cada semana en el Calendario.")}>
      <SegmentedControl<PrimerDiaSemana>
        label={t("La semana empieza el")}
        etiquetaVisible={false}
        value={primer}
        options={[
          { value: "lunes", label: t("Lunes") },
          { value: "domingo", label: t("Domingo") },
        ]}
        onChange={(primerDiaSemana) => cambiar({ primerDiaSemana })}
      />
    </TarjetaAjuste>
  );
}
