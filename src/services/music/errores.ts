export class MusicApiError extends Error {
  readonly hint?: string;
  readonly code?: string;

  constructor(message: string, hint?: string, code?: string) {
    super(message);
    this.name = "MusicApiError";
    this.hint = hint;
    this.code = code;
  }
}
