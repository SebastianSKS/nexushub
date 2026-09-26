"use client";

import { Selector } from "@/components/fluent/Selector";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { useAjustesStore, type ReducirMovimiento } from "@/store/ajustes-store";

/** «Animaciones»: seguir lo que pida Windows, reducirlas siempre (menos movimiento, más comodidad) o dejarlas siempre. */
export function AjusteMovimiento() {
  const t = useT();
  const valor = useAjustesStore((s) => s.reducirMovimiento);
  const cambiar = useAjustesStore((s) => s.cambiar);
  return (
    <TarjetaAjuste glifo="pantalla" titulo={t("Animaciones")} descripcion={t("Las transiciones al cambiar de sección y al abrir cuadros. Reducirlas ayuda si te mareas o quieres que todo sea más directo.")}>
      <Selector<ReducirMovimiento>
        label={t("Animaciones")}
        value={valor}
        options={[
          { value: "sistema", label: t("Igual que Windows") },
          { value: "no", label: t("Todas") },
          { value: "si", label: t("Reducidas") },
        ]}
        onChange={(reducirMovimiento) => cambiar({ reducirMovimiento })}
      />
    </TarjetaAjuste>
  );
}
