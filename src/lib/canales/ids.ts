/** Formatos de identificadores de YouTube. Los comparten el servidor y el cliente. */
export const ID_CANAL = /^UC[\w-]{22}$/;
export const ID_LISTA = /^[\w-]{10,64}$/;
export const ID_VIDEO = /^[\w-]{11}$/;

/** Dominios desde los que se aceptan imágenes de canal (avatares) importadas o guardadas. */
export const HOSTS_AVATAR = /^https:\/\/(?:yt3\.googleusercontent\.com|yt3\.ggpht\.com|i\.ytimg\.com)\//;
