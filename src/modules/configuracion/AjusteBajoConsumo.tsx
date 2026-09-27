"use client";

import { useEffect, useState } from "react";
import { Selector } from "@/components/fluent/Selector";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { ahorroActivo, equipoModesto, pistasDelEquipo, type ModoAhorro, type PistasDelEquipo } from "@/lib/rendimiento";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * «Modo de bajo consumo»: para equipos modestos. Quita la transparencia de la ventana, baja las animaciones y hace el indexado de
 * archivos más pausado. En «Automático» se enciende solo si el equipo parece modesto (pocos núcleos o poca memoria).
 */
export function AjusteBajoConsumo() {
  const t = useT();
  const modo = useAjustesStore((s) => s.modoAhorro);
  const cambiar = useAjustesStore((s) => s.cambiar);
  // Lo que el equipo dice de sí mismo solo se conoce en la ventana (no al generar la página).
  const [equipo, setEquipo] = useState<PistasDelEquipo | null>(null);
  useEffect(() => setEquipo(pistasDelEquipo()), []);

  const activo = equipo ? ahorroActivo(modo, equipo) : false;
  const detalle =
    !equipo || modo !== "auto"
      ? ""
      : equipoModesto(equipo)
        ? ` ${t("Este equipo parece modesto ({nucleos} núcleos), así que está encendido.", { nucleos: equipo.nucleos ?? "?" })}`
        : ` ${t("Este equipo va sobrado ({nucleos} núcleos), así que está apagado.", { nucleos: equipo.nucleos ?? "?" })}`;

  return (
    <TarjetaAjuste
      glifo="energia"
      titulo={t("Modo de bajo consumo")}
      descripcion={`${t("Para equipos modestos: ventana sin transparencia, menos animaciones y búsqueda en archivos más pausada.")}${detalle}${equipo && modo !== "auto" ? ` ${activo ? t("Ahora: encendido.") : t("Ahora: apagado.")}` : ""}`}
    >
      <Selector<ModoAhorro>
        label={t("Modo de bajo consumo")}
        value={modo}
        options={[
          { value: "auto", label: t("Automático") },
          { value: "si", label: t("Siempre encendido") },
          { value: "no", label: t("Apagado") },
        ]}
        onChange={(modoAhorro) => cambiar({ modoAhorro })}
      />
    </TarjetaAjuste>
  );
}
