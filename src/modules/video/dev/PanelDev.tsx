"use client";

import { useState } from "react";
import { Button } from "@/components/fluent/Button";
import { obtenerReproductor } from "@/services/canales/youtube-iframe";
import { useCanalesStore } from "@/store/canales-store";
import { useReproductorStore } from "@/store/reproductor-store";

/**
 * Panel de desarrollo. Solo existe con ?dev=1 y NUNCA entra en la compilación de producción:
 * las páginas de video lo importan detrás de `process.env.NODE_ENV !== "production"`.
 */
export function PanelDev() {
  const dev = useCanalesStore((s) => s.dev);
  const hayVideo = useReproductorStore((s) => s.fuente === "youtube" && s.pista !== null);
  const [nota, setNota] = useState<string | null>(null);
  const store = useCanalesStore.getState();

  const conReproductor = (accion: (p: YT.Player) => void, descripcion: string) => {
    const p = obtenerReproductor();
    if (!p) {
      setNota("Primero reproduce un video: el reproductor aún no existe.");
      return;
    }
    try {
      accion(p);
      setNota(descripcion);
    } catch {
      setNota("El reproductor todavía está cargando. Espera un segundo e inténtalo de nuevo.");
    }
  };

  const saltar = () =>
    conReproductor((p) => {
      const d = p.getDuration();
      if (!(d > 6)) throw new Error("duración desconocida");
      p.seekTo(d - 5, true);
      p.playVideo();
    }, "Saltaste a los últimos 5 segundos. Al terminar debe pasar al siguiente.");

  const forzarError = () =>
    conReproductor((p) => p.loadVideoById("aaaaaaaaaaa"), "Se cargó un video inexistente: debe aparecer el aviso de error.");

  const alternar = (clave: "feedVacio" | "timeoutRed", texto: string) => {
    store.setDev({ [clave]: !dev[clave] });
    void useCanalesStore.getState().cargarTodos({ fresco: true });
    setNota(dev[clave] ? "Desactivado: se recargaron los canales." : texto);
  };

  return (
    <aside
      aria-label="Panel de desarrollo"
      className="acrylic fixed bottom-10 right-4 z-40 w-[280px] rounded-control p-3 shadow-flyout"
    >
      <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-fg-secondary">Desarrollo · ?dev=1</p>
      <div className="flex flex-col gap-2">
        <Button onClick={saltar} disabled={!hayVideo} className="justify-start">
          Saltar a los últimos 5 segundos
        </Button>
        <Button onClick={forzarError} disabled={!hayVideo} className="justify-start">
          Forzar error de incrustación
        </Button>
        <Button variant={dev.feedVacio ? "accent" : "standard"} aria-pressed={dev.feedVacio} onClick={() => alternar("feedVacio", "Feed vacío activo: los canales se ven sin videos.")} className="justify-start">
          Forzar feed vacío {dev.feedVacio && "· activo"}
        </Button>
        <Button variant={dev.timeoutRed ? "accent" : "standard"} aria-pressed={dev.timeoutRed} onClick={() => alternar("timeoutRed", "Timeout activo: los canales fallan como si YouTube no respondiera.")} className="justify-start">
          Forzar timeout de red {dev.timeoutRed && "· activo"}
        </Button>
        <Button
          onClick={() => {
            void store.vaciarCache();
            setNota("Caché vaciada: se recargaron feeds y verificaciones desde YouTube.");
          }}
          className="justify-start"
        >
          Vaciar caché
        </Button>
      </div>
      {!hayVideo && <p className="mt-2 text-caption text-fg-tertiary">Los dos primeros botones necesitan un video en reproducción.</p>}
      {nota && (
        <p className="mt-2 text-caption text-fg-secondary" role="status">
          {nota}
        </p>
      )}
    </aside>
  );
}
