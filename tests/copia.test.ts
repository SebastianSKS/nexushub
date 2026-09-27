import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aplicarCopia, CLAVES_EXCLUIDAS, crearCopia, esClaveDeCopia, leerCopia, MAX_BYTES_COPIA, nombreDeCopia, resumirCopia, type Almacen } from "../src/lib/copia.ts";

/** Un «localStorage» de mentira. */
class AlmacenFalso implements Almacen {
  datos = new Map<string, string>();
  constructor(iniciales: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(iniciales)) this.datos.set(k, v);
  }
  get length() {
    return this.datos.size;
  }
  key(i: number) {
    return [...this.datos.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v);
  }
}

const ahora = new Date(2026, 8, 26, 10, 30);
const lleno = () =>
  new AlmacenFalso({
    "nexushub-ajustes": JSON.stringify({ tema: "claro" }),
    "nexushub-eventos": JSON.stringify([{ id: "1" }, { id: "2" }]),
    "nexushub-horario": JSON.stringify([{ id: "c" }]),
    "nexushub-canales": JSON.stringify([{ id: "x" }, { id: "y" }, { id: "z" }]),
    "nexushub-perfil": JSON.stringify({ nombre: "Ana" }),
    "nexushub-spotify-tokens": "SECRETO",
    "nexushub-spotify-pkce": "temporal",
    "nexushub-ultima-ruta": "/video",
    "otra-app-clave": "no es de Nexo",
  });

describe("crearCopia", () => {
  it("lleva lo de Nexo y deja fuera credenciales, temporales y cosas de otras aplicaciones", () => {
    const c = crearCopia(lleno(), "0.2.0", ahora);
    assert.deepEqual(Object.keys(c.datos).sort(), ["nexushub-ajustes", "nexushub-canales", "nexushub-eventos", "nexushub-horario", "nexushub-perfil"]);
    assert.doesNotMatch(JSON.stringify(c), /SECRETO/);
    assert.equal(c.app, "Nexo");
    assert.equal(c.appVersion, "0.2.0");
    assert.equal(c.creada, ahora.toISOString());
  });
  it("todas las claves excluidas se quedan fuera", () => {
    const a = new AlmacenFalso(Object.fromEntries(CLAVES_EXCLUIDAS.map((k) => [k, "x"])));
    assert.deepEqual(crearCopia(a, "1", ahora).datos, {});
  });
});

describe("leerCopia", () => {
  const buena = () => JSON.stringify(crearCopia(lleno(), "0.2.0", ahora));

  it("lo que exporta Nexo lo lee de vuelta", () => {
    const r = leerCopia(buena());
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(Object.keys(r.copia.datos).length, 5);
      assert.equal(r.ignoradas, 0);
    }
  });

  it("rechaza lo que no es JSON, no es un objeto o no es de Nexo", () => {
    for (const malo of ["", "hola", "[]", "null", "5", '{"app":"Otra"}', '{"app":"Nexo"}']) {
      const r = leerCopia(malo);
      assert.equal(r.ok, false, malo);
    }
  });

  it("rechaza una versión desconocida o más nueva, con un mensaje claro", () => {
    const c = JSON.parse(buena());
    const nueva = leerCopia(JSON.stringify({ ...c, version: 99 }));
    assert.ok(!nueva.ok && /más nueva/.test(nueva.motivo));
    assert.equal(leerCopia(JSON.stringify({ ...c, version: 0 })).ok, false);
    assert.equal(leerCopia(JSON.stringify({ ...c, version: "1" })).ok, false);
  });

  it("descarta lo que no debe entrar aunque venga en el archivo: credenciales, claves ajenas y valores que no son texto", () => {
    const c = JSON.parse(buena());
    c.datos["nexushub-spotify-tokens"] = "ROBADO";
    c.datos["otra-cosa"] = "x";
    c.datos["nexushub-raro"] = 42;
    const r = leerCopia(JSON.stringify(c));
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.ignoradas, 3);
      assert.equal("nexushub-spotify-tokens" in r.copia.datos, false);
      assert.equal("otra-cosa" in r.copia.datos, false);
      assert.equal("nexushub-raro" in r.copia.datos, false);
    }
  });

  it("una copia sin datos utilizables está vacía", () => {
    const r = leerCopia(JSON.stringify({ app: "Nexo", tipo: "copia-de-seguridad", version: 1, datos: { "nexushub-spotify-tokens": "x" } }));
    assert.ok(!r.ok && /vacía/.test(r.motivo));
    assert.equal(leerCopia(JSON.stringify({ app: "Nexo", tipo: "copia-de-seguridad", version: 1, datos: [] })).ok, false);
  });

  it("no se traga archivos enormes", () => {
    const r = leerCopia("x".repeat(MAX_BYTES_COPIA + 1));
    assert.ok(!r.ok && /grande/.test(r.motivo));
  });
});

describe("resumirCopia con promedio", () => {
  it("cuenta las materias del promedio (que se guardan como un objeto, no como lista)", () => {
    const c = crearCopia({ length: 1, key: () => "nexushub-promedio", setItem: () => undefined, getItem: () => JSON.stringify({ escala: { maximo: 10, minimoAprobatorio: 6 }, materias: [{}, {}, {}] }) }, "1.0.0");
    assert.equal(resumirCopia(c).materiasPromedio, 3);
  });
  it("un promedio dañado cuenta como cero", () => {
    const c = crearCopia({ length: 1, key: () => "nexushub-promedio", setItem: () => undefined, getItem: () => "{roto" }, "1.0.0");
    assert.equal(resumirCopia(c).materiasPromedio, 0);
  });
});

describe("resumirCopia", () => {
  it("cuenta lo que trae cada parte", () => {
    const c = crearCopia(lleno(), "0.2.0", ahora);
    assert.deepEqual(resumirCopia(c), { eventos: 2, clases: 1, canales: 3, cumpleanos: 0, notas: 0, favoritos: 0, materiasPromedio: 0, tienePerfil: true });
  });
  it("con datos rotos cuenta cero en vez de fallar", () => {
    const c = crearCopia(new AlmacenFalso({ "nexushub-eventos": "{no es json", "nexushub-horario": '"texto"' }), "1", ahora);
    const r = resumirCopia(c);
    assert.equal(r.eventos, 0);
    assert.equal(r.clases, 0);
  });
});

describe("aplicarCopia", () => {
  it("reemplaza lo que trae y deja lo demás como estaba", () => {
    const origen = crearCopia(lleno(), "0.2.0", ahora);
    const destino = new AlmacenFalso({ "nexushub-ajustes": JSON.stringify({ tema: "oscuro" }), "nexushub-notas": "[1]", "nexushub-spotify-tokens": "MIO" });
    const n = aplicarCopia(origen, destino);
    assert.equal(n, 5);
    assert.equal(destino.getItem("nexushub-ajustes"), JSON.stringify({ tema: "claro" }));
    assert.equal(destino.getItem("nexushub-notas"), "[1]", "lo que la copia no trae se conserva");
    assert.equal(destino.getItem("nexushub-spotify-tokens"), "MIO", "las credenciales del equipo no se tocan");
  });
  it("nunca escribe una clave prohibida aunque la copia la traiga a mano", () => {
    const destino = new AlmacenFalso();
    const n = aplicarCopia({ app: "Nexo", tipo: "copia-de-seguridad", version: 1, creada: "", appVersion: "", datos: { "nexushub-spotify-tokens": "x", "nexushub-ajustes": "{}" } }, destino);
    assert.equal(n, 1);
    assert.equal(destino.getItem("nexushub-spotify-tokens"), null);
  });
  it("ida y vuelta: exportar de un equipo y restaurar en otro da los mismos datos", () => {
    const a = lleno();
    const b = new AlmacenFalso();
    const r = leerCopia(JSON.stringify(crearCopia(a, "0.2.0", ahora)));
    assert.ok(r.ok);
    if (r.ok) aplicarCopia(r.copia, b);
    for (const k of ["nexushub-ajustes", "nexushub-eventos", "nexushub-horario", "nexushub-canales", "nexushub-perfil"]) assert.equal(b.getItem(k), a.getItem(k), k);
  });
});

describe("nombres y claves", () => {
  it("el nombre lleva la fecha con ceros", () => {
    assert.equal(nombreDeCopia(new Date(2026, 0, 5)), "Nexo-copia-2026-01-05.json");
  });
  it("esClaveDeCopia", () => {
    assert.ok(esClaveDeCopia("nexushub-cumples"));
    assert.equal(esClaveDeCopia("nexushub-spotify-tokens"), false);
    assert.equal(esClaveDeCopia("cumples"), false);
  });
});
