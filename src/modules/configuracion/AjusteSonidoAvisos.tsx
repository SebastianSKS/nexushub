"use client";

import { Button } from "@/components/fluent/Button";
import { Selector } from "@/components/fluent/Selector";
import { Slider } from "@/components/fluent/Slider";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useT } from "@/lib/i18n";
import { notificarSistema } from "@/lib/notificar";
import { esSonidoNexo, esSonidoWindows, reproducirSonidoNexo, type SonidoAviso } from "@/lib/sonidos";
import { useAjustesStore } from "@/store/ajustes-store";

/** «Sonido de los avisos»: uno de Nexo (propios), uno de Windows o ninguno; con volumen para los de Nexo y un botón para probarlo. */
export function AjusteSonidoAvisos() {
  const t = useT();
  const sonido = useAjustesStore((s) => s.sonidoAvisos);
  const volumen = useAjustesStore((s) => s.volumenAvisos);
  const cambiar = useAjustesStore((s) => s.cambiar);

  const opciones: { value: SonidoAviso; label: string }[] = [
    { value: "nexo-campana", label: t("Campana") },
    { value: "nexo-gota", label: t("Gota") },
    { value: "nexo-suave", label: t("Suave") },
    { value: "nexo-arpegio", label: t("Arpegio") },
    { value: "nexo-pulso", label: t("Pulso") },
    { value: "windows", label: t("Windows: predeterminado") },
    { value: "windows-correo", label: t("Windows: correo") },
    { value: "windows-recordatorio", label: t("Windows: recordatorio") },
    { value: "windows-sms", label: t("Windows: mensaje de texto") },
    { value: "windows-mensaje", label: t("Windows: mensajería") },
    { value: "ninguno", label: t("Sin sonido") },
  ];

  const probar = (id: SonidoAviso) => {
    if (esSonidoNexo(id)) reproducirSonidoNexo(id, volumen);
    else if (esSonidoWindows(id)) void notificarSistema("Nexo", t("Así suena este aviso."), "prueba-sonido", "/configuracion", { ignorarSilencio: true, sonido: id });
  };

  return (
    <TarjetaAjuste glifo="campana" titulo={t("Sonido de los avisos")} descripcion={t("Con qué suenan las notificaciones de Nexo. Los de Nexo son propios; los de Windows son los del sistema.")}>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {esSonidoNexo(sonido) && (
          <div className="flex w-[150px] items-center gap-2">
            <Slider label={t("Volumen de los avisos")} value={volumen} max={100} valueText={`${volumen} %`} onCommit={(v) => cambiar({ volumenAvisos: v })} onChange={(v) => cambiar({ volumenAvisos: v })} />
            <span className="tabular w-9 text-right text-caption text-fg-secondary">{volumen} %</span>
          </div>
        )}
        <Selector<SonidoAviso>
          label={t("Sonido de los avisos")}
          value={sonido}
          options={opciones}
          onChange={(s) => {
            cambiar({ sonidoAvisos: s });
            if (esSonidoNexo(s)) reproducirSonidoNexo(s, volumen);
          }}
        />
        {sonido !== "ninguno" && <Button onClick={() => probar(sonido)}>{t("Probar")}</Button>}
      </div>
    </TarjetaAjuste>
  );
}
