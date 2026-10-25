import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acotarOpciones,
  candidatos,
  CONTRASENAS_COMUNES,
  contarCandidatos,
  juegoDe,
  MAX_LONGITUD_FUERZA,
  MAX_LONGITUD_NUMEROS,
  type OpcionesRecuperacion,
} from "../src/lib/documents/recuperar-contrasena.ts";
import { algoritmo2, algoritmo3, algoritmo5, comprobarContrasena } from "../src/lib/documents/pdf-seguridad.ts";

const opc = (p: Partial<OpcionesRecuperacion>): OpcionesRecuperacion => ({ metodo: "numeros", maxLongitud: 4, juego: "numeros", ...p });

function tomar<T>(gen: Generator<T>, n: number): T[] {
  const salida: T[] = [];
  for (const x of gen) {
    salida.push(x);
    if (salida.length >= n) break;
  }
  return salida;
}

describe("juegoDe", () => {
  it("da el conjunto de caracteres de cada juego", () => {
    assert.equal(juegoDe("numeros"), "0123456789");
    assert.equal(juegoDe("letras").length, 26);
    assert.equal(juegoDe("letras-numeros").length, 36);
  });
});

describe("acotarOpciones", () => {
  it("limita la longitud según el método", () => {
    assert.equal(acotarOpciones(opc({ metodo: "numeros", maxLongitud: 99 })).maxLongitud, MAX_LONGITUD_NUMEROS);
    assert.equal(acotarOpciones(opc({ metodo: "fuerza-bruta", maxLongitud: 99 })).maxLongitud, MAX_LONGITUD_FUERZA);
    assert.equal(acotarOpciones(opc({ maxLongitud: 0 })).maxLongitud, 1);
  });
  it("no se rompe con valores no numéricos", () => {
    assert.equal(acotarOpciones(opc({ maxLongitud: NaN })).maxLongitud, 1);
  });
});

describe("candidatos · comunes", () => {
  it("recorre la lista de contraseñas comunes tal cual", () => {
    const lista = [...candidatos(opc({ metodo: "comunes" }))];
    assert.deepEqual(lista, [...CONTRASENAS_COMUNES]);
  });
  it("la lista no tiene duplicados", () => {
    assert.equal(new Set(CONTRASENAS_COMUNES).size, CONTRASENAS_COMUNES.length);
  });
});

describe("candidatos · numeros", () => {
  it("empieza por un dígito y respeta los ceros a la izquierda", () => {
    assert.deepEqual(tomar(candidatos(opc({ metodo: "numeros", maxLongitud: 2 })), 12), ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "01"]);
  });
  it("prueba 10^1 + 10^2 + … candidatos", () => {
    assert.equal(contarCandidatos(opc({ metodo: "numeros", maxLongitud: 1 })), 10);
    assert.equal(contarCandidatos(opc({ metodo: "numeros", maxLongitud: 4 })), 10 + 100 + 1000 + 10000);
  });
  it("el conteo coincide con lo que de verdad genera (longitudes cortas)", () => {
    let n = 0;
    for (const _ of candidatos(opc({ metodo: "numeros", maxLongitud: 3 }))) n++;
    assert.equal(n, contarCandidatos(opc({ metodo: "numeros", maxLongitud: 3 })));
  });
});

describe("candidatos · fuerza bruta", () => {
  it("genera todas las combinaciones del juego, por longitud", () => {
    const lista = [...candidatos(opc({ metodo: "fuerza-bruta", juego: "numeros", maxLongitud: 2 }))];
    assert.equal(lista.length, 10 + 100);
    assert.equal(lista[0], "0");
    assert.equal(lista[10], "00");
    assert.equal(lista[11], "01");
    assert.equal(lista[lista.length - 1], "99");
  });
  it("con letras cuenta 26^n", () => {
    assert.equal(contarCandidatos(opc({ metodo: "fuerza-bruta", juego: "letras", maxLongitud: 2 })), 26 + 676);
  });
  it("el conteo coincide con lo generado (letras-números, corto)", () => {
    let n = 0;
    for (const _ of candidatos(opc({ metodo: "fuerza-bruta", juego: "letras-numeros", maxLongitud: 1 }))) n++;
    assert.equal(n, 36);
  });
});

describe("recuperación · encuentra una contraseña débil", () => {
  // Monta los valores O/U que guardaría un PDF protegido con RC4 estándar (lo mismo que hace «Proteger
  // con contraseña») y comprueba que, probando candidatos, se da con ella. Es la vía rápida de verdad.
  const id0 = new TextEncoder().encode("0123456789abcdef");
  const P = -3904;
  const protegerCon = (clave: string) => {
    const O = algoritmo3(clave, clave);
    const U = algoritmo5(algoritmo2(clave, O, P, id0), id0);
    return { O, U };
  };
  const buscar = (op: OpcionesRecuperacion, O: Uint8Array, U: Uint8Array, tope = 2_000_000) => {
    let n = 0;
    for (const c of candidatos(op)) {
      if (++n > tope) break;
      if (comprobarContrasena(c, O, U, P, id0).valida) return c;
    }
    return null;
  };

  it("un PIN de 4 dígitos con el método de números", () => {
    const { O, U } = protegerCon("1234");
    assert.equal(buscar(opc({ metodo: "numeros", maxLongitud: 4 }), O, U), "1234");
  });

  it("una contraseña de la lista de comunes", () => {
    const { O, U } = protegerCon("qwerty");
    assert.equal(buscar(opc({ metodo: "comunes" }), O, U), "qwerty");
  });

  it("una combinación corta de letras con fuerza bruta", () => {
    const { O, U } = protegerCon("abc");
    assert.equal(buscar(opc({ metodo: "fuerza-bruta", juego: "letras", maxLongitud: 3 }), O, U), "abc");
  });

  it("no da un falso positivo cuando la contraseña no está en el espacio de búsqueda", () => {
    const { O, U } = protegerCon("98765");
    assert.equal(buscar(opc({ metodo: "numeros", maxLongitud: 4 }), O, U), null);
  });

  it("el modo automático encuentra una común y un PIN corto", () => {
    const comun = protegerCon("qwerty");
    assert.equal(buscar(opc({ metodo: "auto" }), comun.O, comun.U), "qwerty");
    const pin = protegerCon("7");
    assert.equal(buscar(opc({ metodo: "auto" }), pin.O, pin.U), "7");
  });
});

describe("modo automático", () => {
  it("empieza por las comunes y sigue con números", () => {
    const g = candidatos(opc({ metodo: "auto" }));
    const primeros = [];
    for (const c of g) {
      primeros.push(c);
      if (primeros.length >= CONTRASENAS_COMUNES.length + 3) break;
    }
    assert.deepEqual(primeros.slice(0, CONTRASENAS_COMUNES.length), [...CONTRASENAS_COMUNES]);
    assert.deepEqual(primeros.slice(CONTRASENAS_COMUNES.length), ["0", "1", "2"]);
  });
  it("cuenta comunes + números(6) + letras-números(4)", () => {
    const esperado = CONTRASENAS_COMUNES.length + (10 + 100 + 1000 + 10000 + 100000 + 1000000) + (36 + 1296 + 46656 + 1679616);
    assert.equal(contarCandidatos(opc({ metodo: "auto" })), esperado);
  });
});
