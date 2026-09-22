"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { esEscritorio } from "@/lib/entorno";

type Estado = "inactivo" | "buscando" | "sin-novedades" | "descargando" | "lista" | "error";

const TEXTOS: Record<Estado, string> = {
  inactivo: "Comprueba si hay una versión más nueva de NexusHub.",
  buscando: "Buscando actualizaciones…",
  "sin-novedades": "Ya tienes la última versión.",
  descargando: "Descargando la actualización…",
  lista: "Instalada. Reinicia para terminar.",
  error: "No se pudo comprobar. Revisa tu conexión a internet.",
};

/** Busca, descarga e instala actualizaciones desde el repositorio configurado en tauri.conf.json. */
export function AjusteActualizaciones() {
  const [disponible, setDisponible] = useState(false);
  const [estado, setEstado] = useState<Estado>("inactivo");

  useEffect(() => setDisponible(esEscritorio()), []);

  const buscar = async () => {
    setEstado("buscando");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const actualizacion = await check();
      if (!actualizacion) {
        setEstado("sin-novedades");
        return;
      }
      setEstado("descargando");
      await actualizacion.downloadAndInstall();
      setEstado("lista");
    } catch {
      setEstado("error");
    }
  };

  const reiniciar = async () => {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  };

  if (!disponible) return null;

  return (
    <TarjetaAjuste glifo="actualizar" titulo="Actualizaciones" descripcion={TEXTOS[estado]}>
      {estado === "lista" ? (
        <Button variant="accent" onClick={() => void reiniciar()}>
          Reiniciar ahora
        </Button>
      ) : (
        <Button onClick={() => void buscar()} disabled={estado === "buscando" || estado === "descargando"}>
          Buscar actualizaciones
        </Button>
      )}
    </TarjetaAjuste>
  );
}
