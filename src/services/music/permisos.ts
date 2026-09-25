import { useMusicStore } from "@/store/music-store";

/** Abre la ventana que explica que falta un permiso de Spotify y deja darlo al momento. `paraQue`: «guardar canciones en Me gusta». */
export function pedirPermisoSpotify(paraQue: string) {
  useMusicStore.setState({ permisosBiblioteca: "faltan", dialogoPermisos: paraQue });
}
