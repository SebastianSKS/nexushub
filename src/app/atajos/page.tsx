"use client";

import { useT } from "@/lib/i18n";
import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { KbdCombo } from "@/components/fluent/Kbd";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { SHORTCUTS } from "@/lib/shortcuts";

export default function PaginaAtajos() {
  const t = useT();
  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Atajos de teclado" }]}
      titulo={t("Atajos de teclado")}
      descripcion={t("Todo se puede hacer sin quitar las manos del teclado.")}
      accion={<BotonEnlace href="/configuracion" variant="accent">{t("Abrir Configuración")}</BotonEnlace>}
      principal={
        <ul className="flex flex-col gap-1.5" aria-label={t("Lista de atajos")}>
          {SHORTCUTS.map((s) => (
            <li
              key={s.description}
              className="rounded-control flex h-[52px] items-center justify-between gap-6 border border-stroke bg-layer px-4"
            >
              <span className="text-body text-fg">{t(s.description)}</span>
              <KbdCombo keys={s.keys.map((k) => t(k))} />
            </li>
          ))}
        </ul>
      }
    />
  );
}
