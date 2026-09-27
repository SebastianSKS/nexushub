"use client";

import { Switch } from "@/components/fluent/Switch";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { useAjustesStore } from "@/store/ajustes-store";
import { useConsejosStore } from "@/store/consejos-store";

/** «Consejos al empezar»: avisos breves la primera vez que haces algo. Se pueden apagar, o volver a permitir todos. */
export function AjusteConsejos() {
  const t = useT();
  const activo = useAjustesStore((s) => s.consejos);
  const cambiar = useAjustesStore((s) => s.cambiar);
  return (
    <TarjetaAjuste glifo="informacion" titulo={t("Consejos al empezar")} descripcion={t("Un aviso breve la primera vez que haces algo (guardar tu primera clase, tu primera carpeta…) para explicar qué pasa a continuación.")}>
      <Switch
        checked={activo}
        onChange={(consejos) => {
          cambiar({ consejos });
          if (consejos) useConsejosStore.getState().reiniciar();
        }}
        label={t("Consejos al empezar")}
      />
    </TarjetaAjuste>
  );
}
