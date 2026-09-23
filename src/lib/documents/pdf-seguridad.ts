/**
 * "Cifrado estándar" de PDF, revisión 3 (llave de 128 bits): los algoritmos 2, 3 y 5 de la
 * especificación (ISO 32000-1 §7.6.3.3), con MD5 y RC4 propios (./md5, ./rc4). Lo usan tanto
 * «Proteger con contraseña» (crea O/U/llave) como «Quitar contraseña» (comprueba la contraseña).
 *
 * Nota de alcance: la contraseña se pasa a bytes tomando el código de cada carácter (sirve bien para
 * letras, números y símbolos comunes; con tildes o «ñ» puede no coincidir byte a byte con lo que
 * escriba otro programa, así que se recomiendan contraseñas simples).
 */
import { md5 } from "./md5";
import { rc4 } from "./rc4";

export const LARGO_LLAVE = 16; // 128 bits
export const REVISION = 3;

// Cadena de relleno fija de la especificación (32 bytes).
const RELLENO = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f,
  0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

/** Convierte una contraseña a bytes y la rellena/recorta a 32 bytes (algoritmo 3.2 de la especificación). */
export function contrasenaRellenada(contrasena: string): Uint8Array {
  const bytes = new Uint8Array(contrasena.length);
  for (let i = 0; i < contrasena.length; i++) bytes[i] = contrasena.charCodeAt(i) & 0xff;
  const salida = new Uint8Array(32);
  const n = Math.min(bytes.length, 32);
  salida.set(bytes.subarray(0, n));
  salida.set(RELLENO.subarray(0, 32 - n), n);
  return salida;
}

function concat(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const salida = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    salida.set(p, o);
    o += p.length;
  }
  return salida;
}

/** P (permisos) como 4 bytes, orden de byte menor primero. */
function permisosBytes(p: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setInt32(0, p, true);
  return b;
}

/** Algoritmo 2: la llave de cifrado del archivo, a partir de la contraseña de usuario (o de prueba). */
export function algoritmo2(contrasena: string, O: Uint8Array, P: number, id0: Uint8Array, largoLlave = LARGO_LLAVE): Uint8Array {
  let hash = md5(concat(contrasenaRellenada(contrasena), O, permisosBytes(P), id0));
  let llave = hash.subarray(0, largoLlave);
  for (let i = 0; i < 50; i++) llave = md5(llave).subarray(0, largoLlave);
  return new Uint8Array(llave); // copia: subarray comparte buffer con `hash`, que se reutiliza en el bucle
}

/** RC4 con la llave XOR-eada byte a byte con `n` (algoritmos 3.g y 5.f: 19 rondas extra en la revisión 3). */
function rc4ConXor(llave: Uint8Array, n: number, datos: Uint8Array): Uint8Array {
  const llaveN = llave.map((b) => b ^ n);
  return rc4(llaveN, datos);
}

/** Algoritmo 3: el valor O (contraseña de propietario cifrada) que se guarda en el PDF. */
export function algoritmo3(contrasenaPropietario: string, contrasenaUsuario: string, largoLlave = LARGO_LLAVE): Uint8Array {
  let hash = md5(contrasenaRellenada(contrasenaPropietario || contrasenaUsuario));
  for (let i = 0; i < 50; i++) hash = md5(hash);
  const llaveRc4 = hash.subarray(0, largoLlave);
  let salida = rc4(llaveRc4, contrasenaRellenada(contrasenaUsuario));
  for (let i = 1; i <= 19; i++) salida = rc4ConXor(llaveRc4, i, salida);
  return salida;
}

/** Algoritmo 5: el valor U (contraseña de usuario, para poder comprobarla al abrir). */
export function algoritmo5(llaveArchivo: Uint8Array, id0: Uint8Array): Uint8Array {
  let salida = md5(concat(RELLENO, id0));
  for (let i = 0; i <= 19; i++) salida = i === 0 ? rc4(llaveArchivo, salida) : rc4ConXor(llaveArchivo, i, salida);
  // El valor U completo mide 32 bytes; los últimos 16 son relleno arbitrario (aquí, ceros).
  const u = new Uint8Array(32);
  u.set(salida);
  return u;
}

/** Algoritmo 6: ¿esta contraseña de usuario abre el documento? Compara solo los primeros 16 bytes de U. */
export function comprobarContrasena(contrasena: string, O: Uint8Array, U: Uint8Array, P: number, id0: Uint8Array, largoLlave = LARGO_LLAVE): { valida: boolean; llave: Uint8Array } {
  const llave = algoritmo2(contrasena, O, P, id0, largoLlave);
  const uCalculado = algoritmo5(llave, id0);
  let valida = true;
  for (let i = 0; i < 16; i++) if (uCalculado[i] !== U[i]) valida = false;
  return { valida, llave };
}

/** Llave de cifrado de UN objeto (algoritmo 1): la llave del archivo + su número/generación, otra vez por MD5. */
export function llaveDeObjeto(llaveArchivo: Uint8Array, numeroObjeto: number, generacion: number): Uint8Array {
  const extra = new Uint8Array(5);
  extra[0] = numeroObjeto & 0xff;
  extra[1] = (numeroObjeto >> 8) & 0xff;
  extra[2] = (numeroObjeto >> 16) & 0xff;
  extra[3] = generacion & 0xff;
  extra[4] = (generacion >> 8) & 0xff;
  const hash = md5(concat(llaveArchivo, extra));
  const largo = Math.min(llaveArchivo.length + 5, 16);
  return hash.subarray(0, largo);
}
