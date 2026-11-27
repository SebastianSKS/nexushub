"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";
import { Tooltip } from "@/components/fluent/Tooltip";
import { CATEGORIAS, categoriaActiva, rutaAjustes } from "@/lib/ajustes-categorias";
import { useT } from "@/lib/i18n";
import type { NombreGlifo } from "@/lib/glifos";
import { PILL_SPRING } from "@/lib/motion";
import { useNavStore } from "@/store/nav-store";

function Item({ href, glifo, etiqueta, activa = false, colapsado, ayuda, reemplazar = false }: { href: string; glifo: NombreGlifo; etiqueta: string; activa?: boolean; colapsado: boolean; ayuda?: string; reemplazar?: boolean }) {
  return (
    <Tooltip text={etiqueta} enabled={colapsado}>
      <Link
        href={href}
        replace={reemplazar}
        data-nav-item
        aria-current={activa ? "page" : undefined}
        aria-label={ayuda ? `${etiqueta}. ${ayuda}` : etiqueta}
        title={colapsado ? undefined : ayuda}
        className={clsx(
          "rounded-control reveal relative flex h-10 w-full items-center gap-4 pl-[15px] pr-3 text-body transition-colors duration-exit ease-fluent",
          activa ? "bg-layer-alt text-fg" : "text-fg-secondary hover:bg-layer hover:text-fg active:bg-layer-alt",
        )}
      >
        {activa && <motion.span layoutId="ajustes-pill" transition={PILL_SPRING} aria-hidden className="absolute left-0 h-4 w-[3px] rounded-full bg-accent" style={{ top: 12 }} />}
        <Glifo nombre={glifo} tam={16} className={activa ? "text-accent-text" : undefined} />
        <span className={clsx("truncate transition-opacity duration-exit ease-fluent", colapsado ? "opacity-0" : "opacity-100", activa && "font-semibold")} aria-hidden>
          {etiqueta}
        </span>
      </Link>
    </Tooltip>
  );
}

/**
 * Lo que muestra la barra lateral dentro de Configuración, en lugar de las secciones: «Inicio» (regresa a la pantalla en la
 * que estabas) y las categorías. Cambiar de categoría no se apila en el historial, así «atrás» también sale de Configuración.
 */
export function MenuAjustes({ colapsado }: { colapsado: boolean }) {
  const t = useT();
  const volverA = useNavStore((s) => s.volverA);
  const activa = categoriaActiva(useSearchParams().get("categoria"));

  return (
    <>
      <Item href={volverA} glifo="inicio" etiqueta={t("Inicio")} ayuda={t("Volver a donde estabas")} colapsado={colapsado} />
      <div className="mt-2 border-t border-stroke pt-2">
        <p className={clsx("truncate px-[15px] pb-1 text-caption font-semibold text-fg-tertiary transition-opacity duration-exit ease-fluent", colapsado ? "opacity-0" : "opacity-100")} aria-hidden>
          {t("Configuración")}
        </p>
        <ul className="flex flex-col gap-0.5">
          {CATEGORIAS.map((c) => (
            <li key={c.id}>
              <Item href={rutaAjustes(c.id)} glifo={c.glifo} etiqueta={t(c.titulo)} activa={c.id === activa.id} colapsado={colapsado} reemplazar />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
