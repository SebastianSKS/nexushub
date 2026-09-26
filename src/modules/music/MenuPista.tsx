"use client";

import { useT, T } from "@/lib/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { MenuFlyout, type MenuItem } from "@/components/fluent/MenuFlyout";
import { TextInput } from "@/components/fluent/TextInput";
import { rutaLista } from "@/lib/rutas";
import { agregarAPlaylist, crearPlaylist, guardarMeGusta, quitarDePlaylist } from "@/services/music/biblioteca";
import { fetchMyPlaylists } from "@/services/music/api";
import { avisoBreve } from "@/services/music/megusta";
import { pedirPermisoSpotify } from "@/services/music/permisos";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useMenuPistaStore } from "@/store/menu-pista-store";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;

/** Menú «…» de una canción (clic derecho o botón) y el diálogo para añadirla a una playlist. Se monta una vez, en la ventana. */
export function MenuPista() {
  const t = useT();
  const router = useRouter();
  const menu = useMenuPistaStore((s) => s.menu);
  const playlistDe = useMenuPistaStore((s) => s.playlistDe);
  const conectado = useMusicStore((s) => s.connection.status === "connected");
  const meGusta = useMusicStore((s) => s.meGusta);
  const permisos = useMusicStore((s) => s.permisosBiblioteca);
  const favoritos = useFavoritosStore((s) => s.favoritos);
  const cerrar = useMenuPistaStore.getState().cerrar;

  const items: MenuItem[] = [];
  if (menu) {
    const { pista, artistId, albumId, playlistId } = menu;
    const esCancion = pista.fuente === "spotify" && pista.id.startsWith("track:");
    const pura = pista.id.replace(/^track:/, "");
    if (esCancion && conectado) {
      items.push({ etiqueta: t("Iniciar radio de esta canción"), onSelect: () => useReproductorStore.getState().reproducir(pista) });
      const gusta = meGusta[pista.id] === true || favoritos.some((f) => f.id === pista.id && f.fuente === "spotify");
      items.push({
        etiqueta: gusta ? t("Quitar de Me gusta") : t("Guardar en Me gusta"),
        onSelect: () => {
          if (permisos === "faltan") {
            pedirPermisoSpotify(T("guardar canciones en «Me gusta»"));
            return;
          }
          void guardarMeGusta(pista.id, !gusta).then((r) => {
            if (r === "ok") avisoBreve(gusta ? t("Quitada de «Canciones que te gustan»") : t("Guardada en «Canciones que te gustan»"), pista.titulo);
            else if (r === "permisos") pedirPermisoSpotify(T("guardar canciones en «Me gusta»"));
            else avisoBreve(t("No se pudo actualizar «Me gusta»"), t("Inténtalo de nuevo en un momento."));
          });
          if (gusta) useFavoritosStore.getState().quitarFavorito(pista);
        },
      });
      items.push({ etiqueta: t("Añadir a una playlist…"), onSelect: () => useMenuPistaStore.getState().abrirPlaylists(pista) });
    }
    if (playlistId && esCancion && conectado)
      items.push({
        etiqueta: t("Quitar de esta playlist"),
        onSelect: () => {
          void quitarDePlaylist(playlistId, pista.id).then((r) => {
            if (r === "ok") {
              avisoBreve(t("Quitada de la playlist"), pista.titulo);
              window.dispatchEvent(new CustomEvent("nexushub:playlist-cambiada", { detail: playlistId }));
            } else if (r === "permisos") pedirPermisoSpotify(T("editar tus playlists"));
            else avisoBreve(t("No se pudo quitar de la playlist"), t("Inténtalo de nuevo en un momento."));
          });
        },
      });
    if (artistId && ID_SPOTIFY.test(artistId)) items.push({ etiqueta: t("Ir al artista"), onSelect: () => router.push(rutaLista(artistId, "artist")) });
    if (albumId && ID_SPOTIFY.test(albumId)) items.push({ etiqueta: t("Ir al álbum"), onSelect: () => router.push(rutaLista(albumId, "album")) });
    if (esCancion)
      items.push({
        etiqueta: t("Copiar enlace"),
        onSelect: () => {
          void navigator.clipboard?.writeText(`https://open.spotify.com/track/${pura}`).then(
            () => avisoBreve(t("Enlace copiado")),
            () => avisoBreve(t("No se pudo copiar el enlace")),
          );
        },
      });
  }

  return (
    <>
      <MenuFlyout abierto={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} items={items} etiqueta={t("Opciones de la canción")} onCerrar={cerrar} />
      <DialogoPlaylists pista={playlistDe} />
    </>
  );
}

function DialogoPlaylists({ pista }: { pista: Pista | null }) {
  const t = useT();
  const playlists = useMusicStore((s) => s.playlists);
  const [nueva, setNueva] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cerrar = useMenuPistaStore.getState().cerrarPlaylists;
  const editables = playlists.filter((p) => p.editable !== false);

  const terminar = (r: "ok" | "permisos" | "error", nombre: string) => {
    if (r === "ok") avisoBreve(t("Añadida a «{nombre}»", { nombre }), pista?.titulo);
    else if (r === "permisos") pedirPermisoSpotify(T("añadir canciones a tus playlists"));
    else avisoBreve(t("No se pudo añadir a la playlist"), t("Inténtalo de nuevo en un momento."));
    setNueva("");
    cerrar();
  };

  const añadir = async (id: string, nombre: string) => {
    if (!pista || ocupado) return;
    setOcupado(true);
    terminar(await agregarAPlaylist(id, pista.id), nombre);
    setOcupado(false);
  };

  const crear = async () => {
    if (!pista || ocupado || !nueva.trim()) return;
    setOcupado(true);
    const nombre = nueva.trim();
    const c = await crearPlaylist(nombre);
    if (typeof c === "string") terminar(c, nombre);
    else {
      terminar(await agregarAPlaylist(c.id, pista.id), nombre);
      void fetchMyPlaylists().then((p) => useMusicStore.getState().setPlaylists(p));
    }
    setOcupado(false);
  };

  return (
    <Dialog open={pista !== null} onClose={cerrar} title={t("Añadir a una playlist")} maxWidth={440}>
      <p className="mb-3 truncate text-body text-fg-secondary">{pista ? `${pista.titulo} · ${pista.artista}` : ""}</p>
      <div className="mb-3 flex items-end gap-2">
        <TextInput className="min-w-0 flex-1" label={t("Nueva playlist")} value={nueva} maxLength={100} placeholder={t("Nombre de la playlist")} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void crear()} />
        <Button variant="accent" disabled={!nueva.trim() || ocupado} onClick={() => void crear()}>
          {t("Crear y añadir")}
        </Button>
      </div>
      {editables.length === 0 ? (
        <p className="text-caption text-fg-tertiary">{t("No tienes playlists propias todavía: crea una arriba.")}</p>
      ) : (
        <ul className="max-h-[280px] overflow-y-auto">
          {editables.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={ocupado} onClick={() => void añadir(p.id, p.name)} className="rounded-control flex h-11 w-full items-center gap-3 px-2 text-left transition-colors duration-exit ease-fluent hover:bg-layer-alt disabled:opacity-50">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- carátula remota
                  <img src={p.image} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-[4px] object-cover" />
                ) : (
                  <span className="h-8 w-8 shrink-0 rounded-[4px] bg-layer-alt" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-body text-fg">{p.name}</span>
                {p.tracks !== undefined && <span className="tabular text-caption text-fg-secondary">{p.tracks}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
