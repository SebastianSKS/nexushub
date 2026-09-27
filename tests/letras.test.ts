import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leerLrc, lineaActual } from "../src/services/music/letras.ts";

describe("leerLrc", () => {
  it("saca el segundo y el texto de cada línea", () => {
    const l = leerLrc("[00:12.50] Primera\n[01:05.00]Segunda");
    assert.deepEqual(l, [{ t: 12.5, texto: "Primera" }, { t: 65, texto: "Segunda" }]);
  });
  it("una línea con varias marcas se repite en cada momento", () => {
    const l = leerLrc("[00:10.00][00:40.00] Estribillo");
    assert.deepEqual(l.map((x) => [x.t, x.texto]), [[10, "Estribillo"], [40, "Estribillo"]]);
  });
  it("las líneas salen ordenadas por tiempo aunque vengan desordenadas", () => {
    assert.deepEqual(leerLrc("[00:30.00] B\n[00:10.00] A").map((x) => x.texto), ["A", "B"]);
  });
  it("ignora los metadatos y las líneas sin tiempo, y tolera saltos de Windows", () => {
    const l = leerLrc("[ar:Artista]\r\n[ti:Título]\r\nsin marca\r\n[00:05.00] Hola\r\n");
    assert.deepEqual(l, [{ t: 5, texto: "Hola" }]);
  });
  it("acepta marcas sin decimales y con dos puntos", () => {
    assert.deepEqual(leerLrc("[00:07] Sin decimales")[0]!.t, 7);
    assert.equal(leerLrc("[00:07:50] Con dos puntos")[0]!.t, 7.5);
  });
  it("una línea vacía con marca (un silencio) se conserva con texto vacío", () => {
    assert.deepEqual(leerLrc("[00:20.00]"), [{ t: 20, texto: "" }]);
  });
  it("sin nada, no hay líneas", () => {
    assert.deepEqual(leerLrc(""), []);
  });
});

describe("lineaActual", () => {
  const lineas = [{ t: 5, texto: "a" }, { t: 10, texto: "b" }, { t: 20, texto: "c" }];
  it("antes de la primera línea, ninguna (-1)", () => {
    assert.equal(lineaActual(lineas, 0), -1);
    assert.equal(lineaActual(lineas, 4.9), -1);
  });
  it("da la última línea que ya empezó", () => {
    assert.equal(lineaActual(lineas, 5), 0);
    assert.equal(lineaActual(lineas, 9.99), 0);
    assert.equal(lineaActual(lineas, 10), 1);
    assert.equal(lineaActual(lineas, 15), 1);
  });
  it("pasada la última, se queda en la última", () => {
    assert.equal(lineaActual(lineas, 999), 2);
  });
  it("sin líneas, -1", () => {
    assert.equal(lineaActual([], 10), -1);
  });
});
