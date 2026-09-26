"use client";

import { useT, T } from "@/lib/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { TextInput } from "@/components/fluent/TextInput";
import { eliminarPlaylist, renombrarPlaylist } from "@/services/music/biblioteca";
import { fetchMyPlaylists } from "@/services/music/api";
import { avisoBreve } from "@/services/music/megusta";
import { pedirPermisoSpotify } from "@/services/music/permisos";
import { useMusicStore } from "@/store/music-store";

/** Renombrar y eliminar una playlist tuya (botones de la cabecera y sus diálogos). */
export function AccionesPlaylist({ id, nombre, onRenombrada }: { id: string; nombre: string; onRenombrada: (nuevo: string) => void }) {
  const t = useT();
  const router = useRouter();
  const [dialogo, setDialogo] = useState<"renombrar" | "eliminar" | null>(null);
  const [texto, setTexto] = useState(nombre);
  const [ocupado, setOcupado] = useState(false);

  const refrescarBarraLateral = () => void fetchMyPlaylists().then((p) => useMusicStore.getState().setPlaylists(p));
  const falla = (r: "permisos" | "error") =>
    r === "permisos" ? pedirPermisoSpotify(T("editar tus playlists")) : avisoBreve(t("No se pudo completar"), t("Inténtalo de nuevo en un momento."));

  const renombrar = async () => {
    const n = texto.trim();
    if (!n || ocupado) return;
    setOcupado(true);
    const r = await renombrarPlaylist(id, n);
    setOcupado(false);
    if (r !== "ok") return falla(r);
    setDialogo(null);
    onRenombrada(n);
    refrescarBarraLateral();
    avisoBreve(t("Playlist renombrada"), n);
  };

  const eliminar = async () => {
    if (ocupado) return;
    setOcupado(true);
    const r = await eliminarPlaylist(id);
    setOcupado(false);
    if (r !== "ok") return falla(r);
    setDialogo(null);
    refrescarBarraLateral();
    avisoBreve(t("Playlist eliminada"), nombre);
    router.push("/musica");
  };

  return (
    <>
      <Button
        onClick={() => {
          setTexto(nombre);
          setDialogo("renombrar");
        }}
      >
        {t("Renombrar")}
      </Button>
      <Button onClick={() => setDialogo("eliminar")}>{t("Eliminar")}</Button>

      <Dialog open={dialogo === "renombrar"} onClose={() => setDialogo(null)} title={t("Renombrar playlist")} maxWidth={420}>
        <TextInput label={t("Nombre")} value={texto} maxLength={100} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void renombrar()} />
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDialogo(null)}>{t("Cancelar")}</Button>
          <Button variant="accent" disabled={!texto.trim() || ocupado} onClick={() => void renombrar()}>
            {t("Guardar")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={dialogo === "eliminar"} onClose={() => setDialogo(null)} title={t("¿Eliminar esta playlist?")} maxWidth={420}>
        <p className="text-body text-fg-secondary">{t("«{nombre}» dejará de estar en tu biblioteca de Spotify. Las canciones no se borran de Spotify.", { nombre })}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDialogo(null)}>{t("Cancelar")}</Button>
          <Button variant="accent" disabled={ocupado} onClick={() => void eliminar()}>
            {t("Eliminar")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
