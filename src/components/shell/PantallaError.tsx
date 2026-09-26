"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { abrirReporte, copiarTexto, diagnosticoDeAhora } from "@/lib/diagnostico-app";
import { useT } from "@/lib/i18n";

/**
 * Lo que se ve si una sección se rompe: en vez de una pantalla en blanco, un mensaje claro, que los datos están a salvo
 * y tres salidas (reintentar, ir a Inicio, o pasar los detalles para que se arregle). El resto de la ventana (la barra
 * lateral, la música que suena) sigue funcionando.
 */
export function PantallaError({ error, reintentar }: { error: Error & { digest?: string }; reintentar: () => void }) {
  const t = useT();
  const [aviso, setAviso] = useState<string | null>(null);

  const copiar = async () => {
    const ok = await copiarTexto(await diagnosticoDeAhora(error));
    setAviso(ok ? t("Copiado. Pégalo en tu mensaje.") : t("No se pudo copiar."));
  };

  return (
    <div role="alert" className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-layer-alt text-fg-secondary" aria-hidden>
        <Glifo nombre="aviso" tam={26} />
      </span>
      <h1 className="text-title text-fg">{t("Algo salió mal en esta sección")}</h1>
      <p className="text-body text-fg-secondary">{t("No te preocupes: tus datos están a salvo. Puedes intentarlo otra vez o volver al Inicio. Si se repite, cuéntanos qué estabas haciendo.")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="accent" onClick={reintentar}>
          {t("Reintentar")}
        </Button>
        <Link href="/inicio" className="rounded-control inline-flex h-8 items-center border border-stroke bg-layer-alt px-4 text-body text-fg hover:bg-layer">
          {t("Ir al Inicio")}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="subtle" onClick={() => void copiar()}>
          {t("Copiar detalles")}
        </Button>
        <Button variant="subtle" onClick={async () => void abrirReporte(await diagnosticoDeAhora(error))}>
          {t("Avisar del problema")}
        </Button>
      </div>
      {aviso && (
        <p role="status" className="text-caption text-fg-secondary">
          {aviso}
        </p>
      )}
    </div>
  );
}
