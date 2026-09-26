import { useCalendarioStore } from "@/store/calendario-store";
import { traducir, T } from "@/lib/i18n";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useMusicStore } from "@/store/music-store";
import type { Pista } from "@/store/reproductor-store";
import { guardarMeGusta } from "./biblioteca";
import { pedirPermisoSpotify } from "./permisos";

/** Un aviso breve dentro de la aplicación (se cierra solo). */
export function avisoBreve(titulo: string, texto = "") {
  useCalendarioStore.getState().mostrarAviso({ titulo, texto, destino: null, autocerrar: 3500 });
}

/** ¿Este corazón se dibuja lleno? (favorito en Nexo, o «Me gusta» en Spotify) */
export function esMeGusta(pista: Pick<Pista, "id" | "fuente">, favoritos: readonly Pista[], meGusta: Record<string, boolean>): boolean {
  return favoritos.some((f) => f.id === pista.id && f.fuente === pista.fuente) || (pista.fuente === "spotify" && meGusta[pista.id] === true);
}

/**
 * El corazón: guarda o quita la canción de tus favoritos de Nexo y, con Spotify conectado, también de «Canciones
 * que te gustan» de tu cuenta. Si la sesión es anterior a los permisos de biblioteca, el favorito local se guarda igual y
 * se avisa de que hay que reconectar.
 */
export async function alternarMeGusta(pista: Pista): Promise<void> {
  const fav = useFavoritosStore.getState();
  const ms = useMusicStore.getState();
  const local = fav.esFavorito(pista);
  const quiere = !(local || (pista.fuente === "spotify" && ms.meGusta[pista.id] === true));
  if (quiere !== local) fav.alternarFavorito(pista);

  const conectado = ms.connection.status === "connected";
  if (pista.fuente !== "spotify" || !pista.id.startsWith("track:") || !conectado) return;
  if (ms.permisosBiblioteca === "faltan") {
    avisoBreve(traducir("Guardada en tus favoritos de Nexo"));
    pedirPermisoSpotify(T("guardar también en «Canciones que te gustan» de Spotify"));
    return;
  }
  const r = await guardarMeGusta(pista.id, quiere);
  if (r === "ok") avisoBreve(quiere ? traducir("Guardada en «Canciones que te gustan»") : traducir("Quitada de «Canciones que te gustan»"), pista.titulo);
  else if (r === "permisos") pedirPermisoSpotify(T("guardar en «Canciones que te gustan»"));
  else avisoBreve(traducir("No se pudo actualizar «Canciones que te gustan»"), traducir("Inténtalo de nuevo en un momento."));
}
