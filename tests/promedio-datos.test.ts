import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ESCALA_CIEN, ESCALA_DIEZ, MAX_EVALUACIONES, MAX_MATERIAS, type DatosPromedio, type Evaluacion, type Materia } from "../src/lib/promedio.ts";
import { conEscala, conEvaluacionCambiada, conEvaluacionNueva, conMateriaCambiada, conMateriaNueva, sinEvaluacion, sinMateria } from "../src/lib/promedio-datos.ts";

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

const evaluacion = (id: string, peso = 10): Evaluacion => ({ id, nombre: id, peso, calificacion: null });

describe("evaluaciones", () => {
  it("añade una evaluación solo a la materia pedida", () => {
    const d = conEvaluacionNueva(datos(materia("a"), materia("b")), "a", evaluacion("nueva"));
    assert.deepEqual(d.materias[0]!.evaluaciones.map((e) => e.id), ["ae", "nueva"]);
    assert.equal(d.materias[1]!.evaluaciones.length, 1);
  });
  it("no pasa del máximo de evaluaciones", () => {
    let d = datos(materia("a"));
    for (let i = 0; i < MAX_EVALUACIONES + 5; i++) d = conEvaluacionNueva(d, "a", evaluacion("e" + i));
    assert.equal(d.materias[0]!.evaluaciones.length, MAX_EVALUACIONES);
  });
  it("quita una evaluación", () => {
    assert.equal(sinEvaluacion(datos(materia("a")), "a", "ae").materias[0]!.evaluaciones.length, 0);
  });
  it("acota el peso y la calificación al cambiarlos", () => {
    let d = conEvaluacionCambiada(datos(materia("a")), "a", "ae", { peso: 250, calificacion: 140 });
    assert.equal(d.materias[0]!.evaluaciones[0]!.peso, 100);
    assert.equal(d.materias[0]!.evaluaciones[0]!.calificacion, 100); // el máximo de la escala de 100
    d = conEvaluacionCambiada(d, "a", "ae", { peso: -1, calificacion: -4 });
    assert.equal(d.materias[0]!.evaluaciones[0]!.peso, 0);
    assert.equal(d.materias[0]!.evaluaciones[0]!.calificacion, 0);
  });
  it("una calificación vacía o inválida la deja sin calificar; un peso inválido no cambia el peso", () => {
    let d = conEvaluacionCambiada(datos(materia("a", 80)), "a", "ae", { calificacion: null });
    assert.equal(d.materias[0]!.evaluaciones[0]!.calificacion, null);
    d = conEvaluacionCambiada(d, "a", "ae", { calificacion: Number.NaN, peso: Number.NaN });
    assert.equal(d.materias[0]!.evaluaciones[0]!.calificacion, null);
    assert.equal(d.materias[0]!.evaluaciones[0]!.peso, 100);
  });
  it("cambia el nombre, cortando lo muy largo", () => {
    const d = conEvaluacionCambiada(datos(materia("a")), "a", "ae", { nombre: "y".repeat(90) });
    assert.equal(d.materias[0]!.evaluaciones[0]!.nombre.length, 60);
  });
});
