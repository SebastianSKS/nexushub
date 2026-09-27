/** Carpeta desde la que se sirve la aplicación (vacía en el escritorio; «/nexo-web/demo» en la demo publicada). */
export const BASE_RUTA = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Le antepone la carpeta base a una ruta absoluta de un archivo público («/tesseract/worker.min.js»). */
export const conBase = (ruta: string): string => BASE_RUTA + ruta;
