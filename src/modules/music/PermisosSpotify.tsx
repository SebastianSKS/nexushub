"use client";

import { useT } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { iniciarConexionSpotify } from "@/services/music/oauth";
import { useMusicStore } from "@/store/music-store";

/** Pide el permiso a Spotify y, al terminar, regresa a la pantalla donde estabas. */
export function usePedirPermiso() {
  const ruta = usePathname();
  return () => {
    const q = typeof window !== "undefined" ? window.location.search : "";
    void iniciarConexionSpotify(`${ruta}${q}`);
  };
}

/** Aviso corto, siempre con las mismas palabras, para las pantallas a las que les falta el permiso. */
export function AvisoPermisos({ texto }: { texto?: string }) {
  const t = useT();
  const dar = usePedirPermiso();
  return (
    <InfoBar severity="info" title={t("Activa más funciones de Spotify")} action={<Button variant="accent" onClick={dar}>{t("Dar permiso")}</Button>}>
      {texto ? t(texto) : t("Guardar canciones en «Me gusta», seguir artistas y editar tus playlists. Spotify te pide tu permiso una sola vez y regresas justo aquí.")}
    </InfoBar>
  );
}

/** Ventana que aparece cuando pulsas algo que necesita el permiso nuevo: explica qué es, cuánto tarda y qué pasa después. */
export function DialogoPermisos() {
  const t = useT();
  const motivo = useMusicStore((s) => s.dialogoPermisos);
  const dar = usePedirPermiso();
  const cerrar = () => useMusicStore.setState({ dialogoPermisos: null });
  return (
    <Dialog open={motivo !== null} onClose={cerrar} title={t("Falta un permiso de Spotify")} maxWidth={460}>
      <p className="text-body text-fg">{t("Para {motivo} necesitamos que Spotify te lo permita. Es solo una vez y tarda unos segundos.", { motivo: motivo ? t(motivo) : "" })}</p>
      <ul className="mt-3 list-disc pl-5 text-body text-fg-secondary">
        <li>{t("Guardar canciones en «Me gusta»")}</li>
        <li>{t("Seguir artistas y ver los que sigues")}</li>
        <li>{t("Crear y editar tus playlists")}</li>
        <li>{t("Ver los álbumes que guardaste")}</li>
      </ul>
      <p className="mt-3 text-caption text-fg-tertiary">{t("Se abrirá Spotify para que confirmes y Nexo te trae de vuelta a esta misma pantalla. No pedimos nada más: no podemos ver tu contraseña.")}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={cerrar}>{t("Ahora no")}</Button>
        <Button
          variant="accent"
          onClick={() => {
            cerrar();
            dar();
          }}
        >
          {t("Dar permiso")}
        </Button>
      </div>
    </Dialog>
  );
}
