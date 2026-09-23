/** RC4, el cifrado que pide el "Cifrado estándar" de PDF (revisiones 2 y 3). Simétrico: la misma función cifra y descifra. */
export function rc4(llave: Uint8Array, datos: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i]! + llave[i % llave.length]!) & 0xff;
    [s[i], s[j]] = [s[j]!, s[i]!];
  }
  const salida = new Uint8Array(datos.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < datos.length; n++) {
    i = (i + 1) & 0xff;
    j = (j + s[i]!) & 0xff;
    [s[i], s[j]] = [s[j]!, s[i]!];
    salida[n] = datos[n]! ^ s[(s[i]! + s[j]!) & 0xff]!;
  }
  return salida;
}
