"use client";

import { useState } from "react";
import { Card } from "@/components/fluent/Card";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Switch } from "@/components/fluent/Switch";
import { useT } from "@/lib/i18n";
import { ESCALA_CIEN, ESCALA_DIEZ, escribirNumero, promedioGeneral } from "@/lib/promedio";
import { usePromedioStore } from "@/store/promedio-store";
import { CampoNumero } from "./CampoNumero";

type TipoEscala = "diez" | "cien" | "otra";

/** La escala se reconoce por su máximo: 10 y 100 son las habituales; cualquier otra se ajusta a mano. */
const tipoDe = (maximo: number): TipoEscala => (maximo === 10 ? "diez" : maximo === 100 ? "cien" : "otra");

/** Arriba de la pantalla: tu promedio general y la escala de calificación de tu escuela. */
export function ResumenPromedio() {
  const t = useT();
  const escala = usePromedioStore((s) => s.escala);
  const materias = usePromedioStore((s) => s.materias);
  const cambiarEscala = usePromedioStore((s) => s.cambiarEscala);
  const [soloTerminadas, setSoloTerminadas] = useState(false);

  const general = promedioGeneral(materias, soloTerminadas);

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption text-fg-secondary">{soloTerminadas ? t("Promedio de las materias terminadas") : t("Promedio general")}</p>
          <p className="text-title text-fg tabular-nums" aria-live="polite">
            {general === null ? "—" : escribirNumero(general, 2)}
          </p>
          <p className="text-caption text-fg-tertiary">{t("Escala de 0 a {max}; se aprueba con {min}.", { max: escribirNumero(escala.maximo), min: escribirNumero(escala.minimoAprobatorio) })}</p>
        </div>
        <div className="flex items-center gap-3 text-body text-fg">
          <Switch checked={soloTerminadas} onChange={setSoloTerminadas} label={t("Solo materias terminadas")} />
          <span aria-hidden>{t("Solo materias terminadas")}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-stroke pt-3">
        <SegmentedControl<TipoEscala>
          label={t("Escala de calificación")}
          value={tipoDe(escala.maximo)}
          options={[
            { value: "diez", label: t("0 a 10") },
            { value: "cien", label: t("0 a 100") },
            ...(tipoDe(escala.maximo) === "otra" ? [{ value: "otra" as const, label: t("Otra") }] : []),
          ]}
          onChange={(v) => {
            if (v === "diez") cambiarEscala(ESCALA_DIEZ);
            else if (v === "cien") cambiarEscala(ESCALA_CIEN);
          }}
        />
        <label className="flex items-center gap-2 text-caption text-fg-secondary">
          {t("Se aprueba con")}
          <span className="w-20">
            <CampoNumero
              etiqueta={t("Calificación mínima para aprobar")}
              valor={escala.minimoAprobatorio}
              maximo={escala.maximo}
              onCambio={(v) => cambiarEscala({ ...escala, minimoAprobatorio: v ?? escala.minimoAprobatorio })}
            />
          </span>
        </label>
      </div>
    </Card>
  );
}
