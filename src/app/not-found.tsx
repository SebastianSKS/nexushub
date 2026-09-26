"use client";

import Link from "next/link";
import { Glifo } from "@/components/fluent/Glifo";
import { useT } from "@/lib/i18n";

/** Una dirección que no existe (un enlace viejo, un atajo mal escrito): se explica y se ofrece volver al Inicio. */
export default function NoEncontrada() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-layer-alt text-fg-secondary" aria-hidden>
        <Glifo nombre="buscar" tam={26} />
      </span>
      <h1 className="text-title text-fg">{t("No encontramos esa página")}</h1>
      <p className="text-body text-fg-secondary">{t("Puede que el enlace sea viejo o que la sección haya cambiado de lugar. Usa la barra lateral o la búsqueda (Ctrl+K) para llegar a lo que buscas.")}</p>
      <Link href="/inicio" className="rounded-control inline-flex h-8 items-center bg-accent px-4 text-body text-accent-on hover:bg-accent-hover">
        {t("Ir al Inicio")}
      </Link>
    </div>
  );
}
