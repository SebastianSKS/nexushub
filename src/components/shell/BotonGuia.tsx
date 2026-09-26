"use client";

import { usePathname } from "next/navigation";
import { QuestionCircle16Regular } from "@fluentui/react-icons";
import { GUIAS, guiaDeRuta } from "@/lib/guias";
import { useGuiasStore } from "@/store/guias-store";

/**
 * El «¿Cómo funciona?» que va junto al título de cada página: vuelve a mostrar la guía de la sección en la que se está
 * (en Inicio, la bienvenida). Así, si a alguien se le olvida algo, lo repasa cuando quiera. El signo de interrogación de
 * la barra de arriba hace lo mismo.
 */
export function BotonGuia() {
  const ruta = usePathname();
  const id = guiaDeRuta(ruta);
  if (!id) return null;
  const nombre = id === "bienvenida" ? "la bienvenida" : `«${GUIAS[id].nombre}»`;
  return (
    <button
      type="button"
      onClick={() => useGuiasStore.getState().abrir(id)}
      title={`Ver la guía: cómo funciona ${nombre}`}
      className="rounded-control inline-flex h-7 shrink-0 items-center gap-1.5 border border-stroke bg-layer px-2.5 text-caption text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer-alt hover:text-fg"
    >
      <QuestionCircle16Regular className="text-accent-text" />
      ¿Cómo funciona?
    </button>
  );
}
