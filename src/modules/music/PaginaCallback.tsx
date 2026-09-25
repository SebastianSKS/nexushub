"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { procesarCallback, tomarDestinoDeRegreso } from "@/services/music/oauth";
import { useMusicStore } from "@/store/music-store";

/**
 * /api/spotify/callback — Spotify vuelve aquí tras el inicio de sesión. Es la MISMA dirección que ya
 * tienes registrada en tu app de Spotify (no hace falta cambiarla), solo que ahora es una página
 * normal de Nexo en vez de una ruta de servidor: el intercambio del código ocurre en el navegador.
 */
export function PaginaCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return; // evita repetir el intercambio si el efecto se monta dos veces
    hecho.current = true;

    void (async () => {
      const resultado = await procesarCallback(params);
      const store = useMusicStore.getState();
      if (resultado === "connected") {
        store.setConnection({ status: "connecting" });
      } else if (resultado === "denied") {
        store.setConnection({ status: "error", message: "No autorizaste el acceso a Spotify.", hint: "Puedes volver a intentarlo cuando quieras; el Modo Invitado sigue funcionando." });
      } else if (resultado === "error") {
        store.setConnection({ status: "error", message: "No se pudo completar la conexión con Spotify.", hint: "Revisa que la URI de redirección de tu app de Spotify coincida exactamente e inténtalo de nuevo." });
      }
      router.replace(tomarDestinoDeRegreso() ?? "/musica/");
    })();
  }, [params, router]);

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Música", href: "/musica" }, { etiqueta: "Conectando con Spotify" }]}
      titulo="Conectando con Spotify"
      descripcion="Un momento, te llevamos de vuelta a Música."
      principal={
        <p className="text-body text-fg-secondary" role="status">
          Terminando de iniciar sesión…
        </p>
      }
    />
  );
}
