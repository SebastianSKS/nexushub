import { useT } from "@/lib/i18n";
import Link from "next/link";

export interface Miga {
  etiqueta: string;
  /** Sin href = página actual. */
  href?: string;
}

/**
 * Breadcrumb del Explorador de archivos: «Documentos › Unir PDF». Es JERARQUÍA, no historial:
 * cada segmento anterior es un enlace real (<a>), así que funcionan clic con rueda, «abrir en
 * pestaña nueva» y el menú contextual; y llevan siempre al padre aunque la página se haya
 * abierto directamente.
 */
export function Migas({ migas }: { migas: Miga[] }) {
  const t = useT();
  return (
    <nav aria-label={t("Ruta de navegación")} className="flex h-8 items-center">
      <ol className="flex min-w-0 items-center gap-1 text-body">
        {migas.map((m, i) => {
          const ultima = i === migas.length - 1;
          return (
            <li key={`${t(m.etiqueta)}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <span aria-hidden className="text-fg-tertiary">
                  ›
                </span>
              )}
              {ultima || !m.href ? (
                <span aria-current="page" className="truncate font-semibold text-fg">
                  {t(m.etiqueta)}
                </span>
              ) : (
                <Link
                  href={m.href}
                  className="rounded-input truncate px-1.5 py-0.5 text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer hover:text-fg"
                >
                  {t(m.etiqueta)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
