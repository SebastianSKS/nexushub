"use client";

import { useEffect } from "react";
import { PantallaError } from "@/components/shell/PantallaError";

/** Si una sección lanza un error mientras se dibuja, se ve esta pantalla (dentro de la ventana, sin perder la barra lateral ni la música). */
export default function ErrorDeSeccion({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <PantallaError error={error} reintentar={retry} />;
}
