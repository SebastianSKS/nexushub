"use client";

import { useT } from "@/lib/i18n";
import { Search20Regular } from "@fluentui/react-icons";
import { useCanalesStore } from "@/store/canales-store";

/** Buscador que filtra en vivo los videos ya cargados de tus canales. */
export function BuscadorVideos() {
  const t = useT();
  const busqueda = useCanalesStore((s) => s.busqueda);
  const setBusqueda = useCanalesStore((s) => s.setBusqueda);

  return (
    <div className="w-[250px] max-w-full">
      <label htmlFor="buscar-canales" className="sr-only">
        {t("Buscar en tus canales")}
      </label>
      <div className="relative flex h-8 items-center overflow-hidden rounded-full border border-stroke bg-layer-alt after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:scale-x-0 after:bg-accent after:transition-transform after:duration-enter after:ease-fluent focus-within:after:scale-x-100">
        <Search20Regular className="ml-3 shrink-0 text-fg-secondary" aria-hidden />
        <input
          id="buscar-canales"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t("Buscar en tus canales")}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none"
        />
      </div>
    </div>
  );
}
