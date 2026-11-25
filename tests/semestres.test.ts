import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Clase } from "../src/lib/horario/horario.ts";
import { empezarSemestre, horasPorSemana, materiasDe, MAX_SEMESTRES, nombreDePeriodo, normalizarSemestres, periodoEn, periodoQueEmpieza, sugerirNombre, volverASemestre, type DatosSemestres } from "../src/lib/horario/semestres.ts";
import { useHorarioStore } from "../src/store/horario-store.ts";
import { useSemestresStore } from "../src/store/semestres-store.ts";

const clase = (materia: string, dia = 0): Clase => ({ id: `${materia}-${dia}`, materia, codigo: "", docente: "", aula: "", dia, inicio: "07:00", fin: "09:00", color: "#90cbd9" });
const base: DatosSemestres = { actual: "Ago 2026 – Ene 2027", anteriores: [] };

describe("semestres: nombres", () => {
  it("enero todavía es del semestre que empezó en agosto", () => {
    assert.equal(nombreDePeriodo(periodoEn(new Date(2027, 0, 15))), "Ago 2026 – Ene 2027");
    assert.equal(nombreDePeriodo(periodoEn(new Date(2027, 2, 1))), "Feb – Jun 2027");
    assert.equal(nombreDePeriodo(periodoEn(new Date(2026, 10, 25))), "Ago 2026 – Ene 2027");
  });

  it("en vacaciones propone el que viene", () => {
    assert.equal(nombreDePeriodo(periodoQueEmpieza(new Date(2026, 11, 20))), "Feb – Jun 2027");
    assert.equal(nombreDePeriodo(periodoQueEmpieza(new Date(2027, 0, 25))), "Feb – Jun 2027");
    assert.equal(nombreDePeriodo(periodoQueEmpieza(new Date(2027, 6, 10))), "Ago 2027 – Ene 2028");
  });

  it("nunca propone el mismo nombre que el actual", () => {
    assert.equal(sugerirNombre("Feb – Jun 2027", new Date(2027, 1, 10)), "Ago 2027 – Ene 2028");
  });
});

describe("semestres: guardar y recuperar", () => {
  it("al empezar otro, el que termina se guarda con sus clases y queda primero", () => {
    const uno = empezarSemestre(base, [clase("Redes")], "Feb – Jun 2027", "a", 1000);
    assert.equal(uno.actual, "Feb – Jun 2027");
    assert.deepEqual(uno.anteriores.map((s) => [s.nombre, s.clases.length]), [["Ago 2026 – Ene 2027", 1]]);
    const dos = empezarSemestre(uno, [clase("Física")], "Ago 2027 – Ene 2028", "b", 2000);
    assert.deepEqual(dos.anteriores.map((s) => s.id), ["b", "a"]);
  });

  it("si no había clases no guarda un semestre vacío, y no pasa del máximo", () => {
    assert.equal(empezarSemestre(base, [], "Otro", "a").anteriores.length, 0);
    let datos = base;
    for (let i = 0; i < MAX_SEMESTRES + 3; i++) datos = empezarSemestre(datos, [clase("X")], `S${i}`, `id${i}`);
    assert.equal(datos.anteriores.length, MAX_SEMESTRES);
  });

  it("volver a uno anterior no pierde el que estaba puesto", () => {
    const datos = empezarSemestre(base, [clase("Redes")], "Feb – Jun 2027", "viejo");
    const r = volverASemestre(datos, "viejo", [clase("Física")], "nuevo")!;
    assert.equal(r.datos.actual, "Ago 2026 – Ene 2027");
    assert.deepEqual(r.clases.map((c) => c.materia), ["Redes"]);
    assert.deepEqual(r.datos.anteriores.map((s) => [s.id, s.clases[0]!.materia]), [["nuevo", "Física"]]);
    assert.equal(volverASemestre(datos, "no-existe", [], "x"), null);
  });

  it("resume un semestre: una vez cada materia y las horas de la semana", () => {
    const clases = [clase("Redes", 0), clase("Redes", 2), clase("Cálculo", 1)];
    assert.deepEqual(materiasDe(clases).map((c) => c.materia), ["Cálculo", "Redes"]);
    assert.equal(horasPorSemana(clases), 6);
  });

  it("descarta lo guardado que venga roto", () => {
    const leido = normalizarSemestres({ actual: 5, anteriores: [null, { id: "a", nombre: "Bien", clases: [clase("Redes"), { materia: "" }] }, { id: "b", nombre: "Vacío", clases: [] }] }, "Por defecto");
    assert.equal(leido.actual, "Por defecto");
    assert.deepEqual(leido.anteriores.map((s) => [s.nombre, s.clases.length]), [["Bien", 1]]);
    assert.deepEqual(normalizarSemestres("nada", "N"), { actual: "N", anteriores: [] });
  });
});

describe("semestres: con el horario de la aplicación", () => {
  beforeEach(() => {
    useHorarioStore.setState({ cargado: true, clases: [clase("Redes"), clase("Cálculo", 1)] });
    useSemestresStore.setState({ cargado: true, actual: "Ago 2026 – Ene 2027", anteriores: [] });
  });

  it("empezar vacío deja el horario limpio y el anterior a salvo; volver lo recupera", () => {
    useSemestresStore.getState().empezar("Feb – Jun 2027", []);
    assert.equal(useHorarioStore.getState().clases.length, 0);
    const guardado = useSemestresStore.getState().anteriores[0]!;
    assert.equal(guardado.clases.length, 2);
    useSemestresStore.getState().volverA(guardado.id);
    assert.deepEqual(useHorarioStore.getState().clases.map((c) => c.materia).sort(), ["Cálculo", "Redes"]);
    assert.equal(useSemestresStore.getState().actual, "Ago 2026 – Ene 2027");
    assert.equal(useSemestresStore.getState().anteriores.length, 0);
  });

  it("copiar el actual deja las mismas clases en el nuevo", () => {
    useSemestresStore.getState().empezar("Feb – Jun 2027", useHorarioStore.getState().clases);
    assert.equal(useHorarioStore.getState().clases.length, 2);
    assert.equal(useSemestresStore.getState().anteriores[0]!.clases.length, 2);
  });
});
