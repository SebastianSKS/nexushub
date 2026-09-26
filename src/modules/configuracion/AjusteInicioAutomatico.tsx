"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Switch } from "@/components/fluent/Switch";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { esEscritorio } from "@/lib/entorno";

/**
 * «Iniciar con Windows»: a diferencia de los demás ajustes, la verdad la tiene el propio sistema
 * (el usuario puede quitarlo desde el Administrador de tareas sin pasar por aquí), así que no se
 * guarda en el store de ajustes: se lee de Windows al abrir la página y se cambia ahí mismo.
 */
export function AjusteInicioAutomatico() {
  const t = useT();
  const [disponible, setDisponible] = useState(false);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!esEscritorio()) return;
    setDisponible(true);
    void import("@tauri-apps/plugin-autostart")
      .then(({ isEnabled }) => isEnabled())
      .then(setActivo)
      .catch(() => setError(true));
  }, []);

  if (!disponible) return null;

  return (
    <TarjetaAjuste glifo="energia" titulo={t("Iniciar con Windows")} descripcion={error ? t("No se pudo comprobar. Puede que Windows lo bloquee con una política del sistema.") : t("Abre Nexo, minimizado en la bandeja, al encender el equipo.")}>
      <Switch
        checked={activo}
        label={t("Iniciar con Windows")}
        onChange={(v) => {
          void (async () => {
            try {
              const { enable, disable } = await import("@tauri-apps/plugin-autostart");
              if (v) await enable();
              else await disable();
              setActivo(v);
              setError(false);
            } catch {
              setError(true);
            }
          })();
        }}
      />
    </TarjetaAjuste>
  );
}
