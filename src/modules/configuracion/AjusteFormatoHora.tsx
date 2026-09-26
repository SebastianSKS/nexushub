"use client";

import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useHora } from "@/hooks/useHora";
import { useT } from "@/lib/i18n";
import { useAjustesStore, type FormatoHora } from "@/store/ajustes-store";

/** «Formato de hora»: 24 horas (14:30) o 12 horas con a. m./p. m. (2:30 p. m.), en todo Nexo. */
export function AjusteFormatoHora() {
  const t = useT();
  const { hora } = useHora();
  const formato = useAjustesStore((s) => s.formatoHora);
  const cambiar = useAjustesStore((s) => s.cambiar);
  return (
    <TarjetaAjuste glifo="reloj" titulo={t("Formato de hora")} descripcion={t("Cómo se escriben las horas del horario, el calendario y los avisos. Ahora: {ejemplo}.", { ejemplo: hora("14:30") })}>
      <SegmentedControl<FormatoHora>
        label={t("Formato de hora")}
        etiquetaVisible={false}
        value={formato}
        options={[
          { value: "24h", label: t("24 horas") },
          { value: "12h", label: t("12 horas") },
        ]}
        onChange={(formatoHora) => cambiar({ formatoHora })}
      />
    </TarjetaAjuste>
  );
}
