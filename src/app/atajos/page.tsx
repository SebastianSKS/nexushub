"use client";

import { BotonEnlace } from "@/components/fluent/BotonEnlace";
import { KbdCombo } from "@/components/fluent/Kbd";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { SHORTCUTS } from "@/lib/shortcuts";

export default function PaginaAtajos() {
  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Atajos de teclado" }]}
      titulo="Atajos de teclado"
      descripcion="Todo se puede hacer sin quitar las manos del teclado."
      accion={<BotonEnlace href="/configuracion" variant="accent">Abrir Configuración</BotonEnlace>}
      principal={
        <ul className="flex flex-col gap-1.5" aria-label="Lista de atajos">
          {SHORTCUTS.map((s) => (
            <li
              key={s.description}
              className="rounded-control flex h-[52px] items-center justify-between gap-6 border border-stroke bg-layer px-4"
            >
              <span className="text-body text-fg">{s.description}</span>
              <KbdCombo keys={s.keys} />
            </li>
          ))}
        </ul>
      }
    />
  );
}
