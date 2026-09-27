"use client";

import { useEstadoPasos } from "@/hooks/usePrimerosPasos";
import { useRouter } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { usePrimerosPasosStore } from "@/store/primeros-pasos-store";

/** «Primeros pasos»: la lista de Inicio, por si la ocultaste (o la terminaste) y quieres volver a verla. */
export function AjustePrimerosPasos() {
  const t = useT();
  const router = useRouter();
  const oculta = usePrimerosPasosStore((s) => s.descartado || s.completado);
  const { progreso } = useEstadoPasos();
  return (
    <TarjetaAjuste
      glifo="informacion"
      titulo={t("Primeros pasos")}
      descripcion={progreso.completo ? t("Ya completaste todos los pasos. ¡Buen trabajo!") : t("La lista de Inicio que te lleva por lo básico de Nexo. Si la ocultaste, puedes verla otra vez.")}
    >
      {!progreso.completo && (
        <Button
          onClick={() => {
            usePrimerosPasosStore.getState().reiniciar();
            router.push("/inicio");
          }}
        >
          {oculta ? t("Mostrarla otra vez") : t("Verla en Inicio")}
        </Button>
      )}
    </TarjetaAjuste>
  );
}
