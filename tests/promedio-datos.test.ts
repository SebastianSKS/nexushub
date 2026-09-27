import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ESCALA_CIEN, ESCALA_DIEZ, MAX_MATERIAS, type DatosPromedio, type Materia } from "../src/lib/promedio.ts";
import { conEscala, conMateriaCambiada, conMateriaNueva, sinMateria } from "../src/lib/promedio-datos.ts";

const materia = (id: string, cal: number | null = null): Materia => ({ id, nombre: id, creditos: 1, evaluaciones: [{ id: id + "e", nombre: "Parcial", peso: 100, calificacion: cal }] });
const datos = (...m: Materia[]): DatosPromedio => ({ escala: ESCALA_CIEN, materias: m });

describe("conEscala", () => {
  it("cambia la escala sin tocar los datos originales", () => {
    const antes = datos(materia("a", 80));
    const despues = conEscala(antes, ESCALA_DIEZ);
    assert.deepEqual(antes.escala, ESCALA_CIEN);
    assert.deepEqual(despues.escala, ESCALA_DIEZ);
  });
  it("baja al máximo las calificaciones que ya no caben", () => {
    const despues = conEscala(datos(materia("a", 85), materia("b", 5), materia("c", null)), ESCALA_DIEZ);
    assert.deepEqual(despues.materias.map((m) => m.evaluaciones[0]!.calificacion), [10, 5, null]);
  });
  it("una escala sin sentido se corrige", () => {
    assert.deepEqual(conEscala(datos(), { maximo: -3, minimoAprobatorio: 999 }).escala, { maximo: 1, minimoAprobatorio: 1 });
  });
});

describe("conMateriaNueva, sinMateria y conMateriaCambiada", () => {
  it("añade al final sin tocar lo anterior", () => {
    const antes = datos(materia("a"));
    const despues = conMateriaNueva(antes, materia("b"));
    assert.equal(antes.materias.length, 1);
    assert.deepEqual(despues.materias.map((m) => m.id), ["a", "b"]);
  });
  it("no pasa del máximo de materias", () => {
    let d = datos();
    for (let i = 0; i < MAX_MATERIAS + 5; i++) d = conMateriaNueva(d, materia("m" + i));
    assert.equal(d.materias.length, MAX_MATERIAS);
  });
  it("quita la materia pedida", () => {
    assert.deepEqual(sinMateria(datos(materia("a"), materia("b")), "a").materias.map((m) => m.id), ["b"]);
    assert.equal(sinMateria(datos(materia("a")), "no-existe").materias.length, 1);
  });
  it("cambia nombre y créditos, con límites", () => {
    const d = conMateriaCambiada(datos(materia("a")), "a", { nombre: "x".repeat(100), creditos: 99 });
    assert.equal(d.materias[0]!.nombre.length, 60);
    assert.equal(d.materias[0]!.creditos, 20);
    assert.equal(conMateriaCambiada(datos(materia("a")), "a", { creditos: 0 }).materias[0]!.creditos, 1);
    assert.equal(conMateriaCambiada(datos(materia("a")), "a", { creditos: 3.6 }).materias[0]!.creditos, 4);
  });
  it("cambiar una materia no toca a las demás", () => {
    const d = conMateriaCambiada(datos(materia("a"), materia("b")), "a", { nombre: "Nueva" });
    assert.equal(d.materias[1]!.nombre, "b");
  });
});
