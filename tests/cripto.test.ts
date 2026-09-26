import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { md5 } from "../src/lib/documents/md5.ts";
import { comprobarContrasena, algoritmo2, algoritmo3, algoritmo5, contrasenaRellenada, llaveDeObjeto } from "../src/lib/documents/pdf-seguridad.ts";
import { rc4 } from "../src/lib/documents/rc4.ts";
import { crearChallenge, crearEstado, crearVerificador } from "../src/lib/music/pkce.ts";

const bytes = (t: string) => new TextEncoder().encode(t);
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

describe("md5 (vectores de la RFC 1321)", () => {
  const casos: [string, string][] = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["12345678901234567890123456789012345678901234567890123456789012345678901234567890", "57edf4a22be3c955ac49da2e2107b67a"],
  ];
  for (const [entrada, esperado] of casos) it(`«${entrada.slice(0, 20)}»`, () => assert.equal(hex(md5(bytes(entrada))), esperado));

  it("coincide con el md5 de Node en datos al azar de todos los tamaños (los bordes del bloque de 64 bytes)", () => {
    for (const n of [1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000, 4096]) {
      const datos = randomBytes(n);
      assert.equal(hex(md5(datos)), createHash("md5").update(datos).digest("hex"), `${n} bytes`);
    }
  });
});

describe("rc4", () => {
  it("vectores conocidos", () => {
    assert.equal(hex(rc4(bytes("Key"), bytes("Plaintext"))), "bbf316e8d940af0ad3");
    assert.equal(hex(rc4(bytes("Wiki"), bytes("pedia"))), "1021bf0420");
    assert.equal(hex(rc4(bytes("Secret"), bytes("Attack at dawn"))), "45a01f645fc35b383552544b9bf5");
  });
  it("cifrar dos veces devuelve el original", () => {
    const llave = randomBytes(16);
    const datos = randomBytes(5000);
    assert.deepEqual(rc4(llave, rc4(llave, datos)), new Uint8Array(datos));
  });
  it("no toca los datos de entrada", () => {
    const datos = bytes("hola mundo");
    const copia = new Uint8Array(datos);
    rc4(bytes("k"), datos);
    assert.deepEqual(datos, copia);
  });
});

describe("seguridad de PDF (algoritmos de la especificación)", () => {
  const id0 = bytes("0123456789abcdef");
  const P = -3904;

  it("la contraseña se rellena a 32 bytes con la cadena estándar del PDF", () => {
    const r = contrasenaRellenada("abc");
    assert.equal(r.length, 32);
    assert.deepEqual([...r.slice(0, 3)], [97, 98, 99]);
    assert.equal(r[3], 0x28, "empieza el relleno estándar (28 BF 4E 5E…)");
    assert.equal(contrasenaRellenada("").length, 32);
    assert.equal(contrasenaRellenada("x".repeat(100)).length, 32);
  });

  it("con las contraseñas correctas, la comprobación acierta; con otra, no", () => {
    const O = algoritmo3("dueño", "usuario");
    assert.equal(O.length, 32);
    const llave = algoritmo2("usuario", O, P, id0);
    assert.equal(llave.length, 16);
    const U = algoritmo5(llave, id0);
    assert.equal(U.length, 32);
    const buena = comprobarContrasena("usuario", O, U, P, id0);
    assert.equal(buena.valida, true);
    assert.deepEqual(buena.llave, llave, "y da la misma llave del archivo");
    assert.equal(comprobarContrasena("otra", O, U, P, id0).valida, false);
    assert.equal(comprobarContrasena("", O, U, P, id0).valida, false);
  });

  it("la llave de cada objeto depende de su número y su generación", () => {
    const llave = randomBytes(16);
    const a = llaveDeObjeto(llave, 5, 0);
    assert.notDeepEqual(a, llaveDeObjeto(llave, 6, 0));
    assert.notDeepEqual(a, llaveDeObjeto(llave, 5, 1));
    assert.deepEqual(a, llaveDeObjeto(llave, 5, 0));
    assert.ok(a.length >= 10 && a.length <= 16);
  });
});

describe("PKCE (inicio de sesión de Spotify)", () => {
  it("el desafío de la RFC 7636 (apéndice B)", async () => {
    assert.equal(await crearChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("el verificador es base64url de entre 43 y 128 caracteres y no se repite", () => {
    const a = crearVerificador();
    const b = crearVerificador();
    assert.match(a, /^[A-Za-z0-9_-]{43,128}$/);
    assert.notEqual(a, b);
  });
  it("el estado es aleatorio y distinto cada vez", () => {
    assert.notEqual(crearEstado(), crearEstado());
    assert.ok(crearEstado().length >= 16);
  });
});
