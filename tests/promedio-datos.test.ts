import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ESCALA_CIEN, ESCALA_DIEZ, type DatosPromedio, type Materia } from "../src/lib/promedio.ts";
import { conEscala } from "../src/lib/promedio-datos.ts";

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
