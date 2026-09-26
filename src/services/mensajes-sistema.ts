import { T, traducir } from "@/lib/i18n";

/**
 * Los mensajes de error que la parte de escritorio (Rust) manda ya escritos en español. Aquí están todos como claves de
 * traducción (por eso el marcado T) y `delSistema` los muestra en el idioma de ahora; lo que no esté aquí se ve tal cual.
 */
export const MENSAJES_DEL_SISTEMA = [
  T("Ese nombre no es válido."),
  T("Windows no permite ese nombre; prueba con otro."),
  T("Ya existe una carpeta con ese nombre."),
  T("Ya existe un archivo con ese nombre."),
  T("Esa carpeta ya no existe."),
  T("Ese archivo ya no existe."),
  T("Ese archivo ya no está ahí."),
  T("Eso ya no existe."),
  T("La carpeta tiene archivos. Bórralos o muévelos primero."),
  T("Falta un dato."),
  T("Falta el nombre."),
  T("No llegó el archivo."),
  T("El archivo pesa demasiado (máximo 200 MB)."),
  T("El archivo pesa demasiado para leerlo."),
  T("El archivo está vacío o pesa demasiado (máximo 100 MB)."),
  T("Solo se pueden leer PDF."),
  T("Ruta no permitida."),
  T("Ese tipo de archivo no es válido."),
  T("Ese tipo de archivo no se puede convertir con Office."),
  T("Motor desconocido."),
  T("Office tardó demasiado en convertir el archivo."),
  T("Ese programa no está en tu menú Inicio."),
  T("Ese programa no se puede abrir."),
  T("Esto solo funciona en Windows."),
  T("Solo en Windows."),
] as const;

/** Un mensaje que vino de la parte de escritorio, en el idioma de ahora. */
export const delSistema = (mensaje: string): string => traducir(mensaje);
