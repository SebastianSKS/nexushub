"use client";

import { ExpansorAjuste, FilaAjuste } from "@/components/fluent/TarjetaAjuste";
import { Switch } from "@/components/fluent/Switch";
import { useT } from "@/lib/i18n";
import { SECCIONES } from "@/lib/rutas";
import { SECCIONES_OCULTABLES, useAjustesStore, type SeccionOcultable } from "@/store/ajustes-store";

/** «Secciones de la barra lateral»: esconde las que no usas (Inicio y Configuración siempre están). Siguen con su atajo Ctrl+n y en Ctrl+K. */
export function AjusteBarraLateral() {
  const t = useT();
  const ocultas = useAjustesStore((s) => s.seccionesOcultas);
  const cambiar = useAjustesStore((s) => s.cambiar);
  const alternar = (id: SeccionOcultable, visible: boolean) => cambiar({ seccionesOcultas: visible ? ocultas.filter((x) => x !== id) : [...ocultas, id] });

  return (
    <ExpansorAjuste
      glifo="menu"
      titulo={t("Secciones de la barra lateral")}
      descripcion={t("Esconde las que no usas. Siguen ahí: se abren con su atajo Ctrl+número y con la búsqueda (Ctrl+K).")}
      filas={SECCIONES_OCULTABLES.map((id) => {
        const seccion = SECCIONES.find((s) => s.id === id);
        if (!seccion) return null;
        const visible = !ocultas.includes(id);
        return (
          <FilaAjuste key={id} titulo={t(seccion.etiqueta)}>
            <Switch checked={visible} onChange={(v) => alternar(id, v)} label={t("Mostrar {seccion} en la barra lateral", { seccion: t(seccion.etiqueta) })} />
          </FilaAjuste>
        );
      })}
    />
  );
}
