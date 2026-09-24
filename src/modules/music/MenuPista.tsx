"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { MenuFlyout, type MenuItem } from "@/components/fluent/MenuFlyout";
import { TextInput } from "@/components/fluent/TextInput";
import { rutaLista } from "@/lib/rutas";
import { agregarAPlaylist, crearPlaylist, guardarMeGusta } from "@/services/music/biblioteca";
import { fetchMyPlaylists } from "@/services/music/api";
import { avisoBreve } from "@/services/music/megusta";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useMenuPistaStore } from "@/store/menu-pista-store";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore, type Pista } from "@/store/reproductor-store";

const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;

/** Menú «…» de una canción (clic derecho o botón) y el diálogo para añadirla a una playlist. Se monta una vez, en la ventana. */
export function MenuPista() {
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
    const { pista, artistId, albumId } = menu;
    const esCancion = pista.fuente === "spotify" && pista.id.startsWith("track:");
    const pura = pista.id.replace(/^track:/, "");
    items.push({
      etiqueta: "Añadir a la cola",
      onSelect: () => {
        useReproductorStore.getState().encolarSiguiente(pista);
        avisoBreve("Añadida a la cola", "Sonará justo después de la actual.");
      },
    });
    if (esCancion && conectado) {
      const gusta = meGusta[pista.id] === true || favoritos.some((f) => f.id === pista.id && f.fuente === "spotify");
      items.push({
        etiqueta: gusta ? "Quitar de Me gusta" : "Guardar en Me gusta",
        onSelect: () => {
          if (permisos === "faltan") {
            avisoBreve("Falta un permiso de Spotify", "Vuelve a conectar tu cuenta en Música para usar «Me gusta».");
            return;
          }
          void guardarMeGusta(pista.id, !gusta).then((r) => {
            if (r === "ok") avisoBreve(gusta ? "Quitada de «Canciones que te gustan»" : "Guardada en «Canciones que te gustan»", pista.titulo);
            else if (r === "permisos") avisoBreve("Falta un permiso de Spotify", "Vuelve a conectar tu cuenta en Música para usar «Me gusta».");
            else avisoBreve("No se pudo actualizar «Me gusta»", "Inténtalo de nuevo en un momento.");
          });
          if (gusta) useFavoritosStore.getState().quitarFavorito(pista);
        },
      });
      items.push({ etiqueta: "Añadir a una playlist…", onSelect: () => useMenuPistaStore.getState().abrirPlaylists(pista) });
    }
    if (artistId && ID_SPOTIFY.test(artistId)) items.push({ etiqueta: "Ir al artista", onSelect: () => router.push(rutaLista(artistId, "artist")) });
    if (albumId && ID_SPOTIFY.test(albumId)) items.push({ etiqueta: "Ir al álbum", onSelect: () => router.push(rutaLista(albumId, "album")) });
    if (esCancion)
      items.push({
        etiqueta: "Copiar enlace",
        onSelect: () => {
          void navigator.clipboard?.writeText(`https://open.spotify.com/track/${pura}`).then(
            () => avisoBreve("Enlace copiado"),
            () => avisoBreve("No se pudo copiar el enlace"),
          );
        },
      });
  }

  return (
    <>
      <MenuFlyout abierto={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} items={items} etiqueta="Opciones de la canción" onCerrar={cerrar} />
      <DialogoPlaylists pista={playlistDe} />
    </>
  );
}

function DialogoPlaylists({ pista }: { pista: Pista | null }) {
  const playlists = useMusicStore((s) => s.playlists);
  const [nueva, setNueva] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cerrar = useMenuPistaStore.getState().cerrarPlaylists;
  const editables = playlists.filter((p) => p.editable !== false);

  const terminar = (r: "ok" | "permisos" | "error", nombre: string) => {
    if (r === "ok") avisoBreve(`Añadida a «${nombre}»`, pista?.titulo);
    else if (r === "permisos") avisoBreve("Falta un permiso de Spotify", "Vuelve a conectar tu cuenta en Música para editar tus playlists.");
    else avisoBreve("No se pudo añadir a la playlist", "Inténtalo de nuevo en un momento.");
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
    <Dialog open={pista !== null} onClose={cerrar} title="Añadir a una playlist" maxWidth={440}>
      <p className="mb-3 truncate text-body text-fg-secondary">{pista ? `${pista.titulo} · ${pista.artista}` : ""}</p>
      <div className="mb-3 flex items-end gap-2">
        <TextInput className="min-w-0 flex-1" label="Nueva playlist" value={nueva} maxLength={100} placeholder="Nombre de la playlist" onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void crear()} />
        <Button variant="accent" disabled={!nueva.trim() || ocupado} onClick={() => void crear()}>
          Crear y añadir
        </Button>
      </div>
      {editables.length === 0 ? (
        <p className="text-caption text-fg-tertiary">No tienes playlists propias todavía: crea una arriba.</p>
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
