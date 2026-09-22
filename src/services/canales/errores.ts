/** Error de canales pensado para mostrarse al usuario: dice qué pasó y qué hacer. */
export class ErrorApi extends Error {
  readonly pista?: string;
  readonly codigo?: string;

  constructor(mensaje: string, pista?: string, codigo?: string) {
    super(mensaje);
    this.name = "ErrorApi";
    this.pista = pista;
    this.codigo = codigo;
  }
}
