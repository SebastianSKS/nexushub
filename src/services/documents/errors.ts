/** Error que ya trae un mensaje para el usuario (qué pasó + qué hacer). */
export class DocumentError extends Error {
  readonly hint?: string;
  readonly code?: string;

  constructor(message: string, hint?: string, code?: string) {
    super(message);
    this.name = "DocumentError";
    this.hint = hint;
    this.code = code;
  }
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Convierte cualquier fallo en {message, hint} presentable. Nunca "undefined" ni trazas. */
export function describeError(err: unknown): { message: string; hint?: string } {
  if (err instanceof DocumentError) return { message: err.message, hint: err.hint };
  return {
    message: "Ocurrió un error inesperado.",
    hint: "Inténtalo de nuevo. Si se repite, prueba con otro archivo.",
  };
}
