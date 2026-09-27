import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_EVALUACIONES, MAX_MATERIAS, normalizarPromedio, calificacionFinal, evaluacionesIniciales, promedioGeneral, pesoSinRepartir, repartirPesos, type Materia, ESCALA_CIEN, ESCALA_DIEZ, estadoMateria, necesarioParaAprobar, pesoEvaluado, pesoPendiente, promedioParcial, puntosGanados, redondear, type Evaluacion } from "../src/lib/promedio.ts";

describe("escalas", () => {
  it("la de 10 aprueba con 6 y la de 100 con 70", () => {
    assert.deepEqual(ESCALA_DIEZ, { maximo: 10, minimoAprobatorio: 6 });
    assert.deepEqual(ESCALA_CIEN, { maximo: 100, minimoAprobatorio: 70 });
  });
});

describe("redondear", () => {
  it("redondea al decimal pedido", () => {
    assert.equal(redondear(8.46), 8.5);
    assert.equal(redondear(8.44), 8.4);
    assert.equal(redondear(7, 2), 7);
  });
  it("no cae en los errores de la coma flotante", () => {
    assert.equal(redondear(1.005, 2), 1.01);
    assert.equal(redondear(0.1 + 0.2, 2), 0.3);
  });
});

const ev = (peso: number, calificacion: number | null, nombre = "x"): Evaluacion => ({ id: nombre + peso, nombre, peso, calificacion });

describe("pesoEvaluado y pesoPendiente", () => {
  it("solo cuentan las evaluaciones ya calificadas", () => {
    const lista = [ev(30, 8), ev(30, null), ev(20, 9)];
    assert.equal(pesoEvaluado(lista), 50);
    assert.equal(pesoPendiente(lista), 50);
  });
  it("sin nada calificado falta todo", () => {
    assert.equal(pesoEvaluado([]), 0);
    assert.equal(pesoPendiente([ev(40, null)]), 100);
  });
  it("con todo calificado no falta nada, y nunca sale negativo", () => {
    assert.equal(pesoPendiente([ev(60, 7), ev(40, 9)]), 0);
    assert.equal(pesoPendiente([ev(70, 7), ev(50, 9)]), 0);
  });
});

describe("puntosGanados", () => {
  it("cada calificación cuenta por su peso", () => {
    assert.equal(redondear(puntosGanados([ev(30, 8), ev(20, 10)]), 2), 4.4);
  });
  it("lo que no está calificado no suma", () => {
    assert.equal(puntosGanados([ev(50, null)]), 0);
  });
});

describe("promedioParcial", () => {
  it("es el promedio de lo calificado, ponderado", () => {
    // 8 con peso 30 y 10 con peso 20: (2.4 + 2) / 0.5 = 8.8
    assert.equal(redondear(promedioParcial([ev(30, 8), ev(20, 10), ev(50, null)])!, 2), 8.8);
  });
  it("sin calificaciones no hay promedio", () => {
    assert.equal(promedioParcial([]), null);
    assert.equal(promedioParcial([ev(40, null)]), null);
  });
  it("con una sola calificación, es esa", () => {
    assert.equal(promedioParcial([ev(15, 7.5)]), 7.5);
  });
});

describe("calificacionFinal", () => {
  it("con todo calificado es la suma ponderada", () => {
    assert.equal(redondear(calificacionFinal([ev(60, 8), ev(40, 9)])!, 2), 8.4);
  });
  it("mientras falte algo por calificar no hay final", () => {
    assert.equal(calificacionFinal([ev(60, 8), ev(40, null)]), null);
    assert.equal(calificacionFinal([ev(60, 8)]), null);
  });
  it("tolera pesos con decimales que suman 100", () => {
    assert.notEqual(calificacionFinal([ev(33.3, 9), ev(33.3, 9), ev(33.4, 9)]), null);
  });
});

describe("necesarioParaAprobar", () => {
  it("dice cuánto necesitas en lo que falta", () => {
    // Llevas 8 con peso 50 (4 puntos); para llegar a 6 faltan 2 puntos en el 50 % restante: 4.
    const n = necesarioParaAprobar([ev(50, 8), ev(50, null)], ESCALA_DIEZ);
    assert.equal(n.tipo, "necesitas");
    assert.equal(n.tipo === "necesitas" && redondear(n.calificacion, 2), 4);
  });
  it("si ya llegaste al mínimo, ya aprobaste", () => {
    assert.deepEqual(necesarioParaAprobar([ev(70, 9), ev(30, null)], ESCALA_DIEZ), { tipo: "aprobada" });
  });
  it("si no queda nada por calificar, dice cómo terminó", () => {
    assert.deepEqual(necesarioParaAprobar([ev(100, 7)], ESCALA_DIEZ), { tipo: "terminada", aprobada: true });
    assert.deepEqual(necesarioParaAprobar([ev(100, 5)], ESCALA_DIEZ), { tipo: "terminada", aprobada: false });
  });
  it("si ni con el máximo alcanza, es imposible y dice hasta dónde llegarías", () => {
    const n = necesarioParaAprobar([ev(80, 2), ev(20, null)], ESCALA_DIEZ);
    assert.equal(n.tipo, "imposible");
    assert.equal(n.tipo === "imposible" && redondear(n.maxima, 2), 3.6);
  });
  it("sin nada calificado necesitas el mínimo en todo", () => {
    const n = necesarioParaAprobar([ev(100, null)], ESCALA_CIEN);
    assert.equal(n.tipo === "necesitas" && n.calificacion, 70);
  });
  it("con el mínimo justo en el puntaje, cuenta como aprobada", () => {
    assert.deepEqual(necesarioParaAprobar([ev(60, 10), ev(40, null)], ESCALA_DIEZ), { tipo: "aprobada" });
  });
});

describe("estadoMateria", () => {
  it("sin calificaciones no hay estado", () => {
    assert.equal(estadoMateria([ev(100, null)], ESCALA_DIEZ), "sin-datos");
  });
  it("terminada: aprobada o reprobada", () => {
    assert.equal(estadoMateria([ev(100, 8)], ESCALA_DIEZ), "aprobada");
    assert.equal(estadoMateria([ev(100, 5)], ESCALA_DIEZ), "reprobada");
  });
  it("asegurada cuando ya no necesitas nada más", () => {
    assert.equal(estadoMateria([ev(70, 9), ev(30, null)], ESCALA_DIEZ), "asegurada");
  });
  it("perdida cuando ni con el máximo llegas", () => {
    assert.equal(estadoMateria([ev(80, 2), ev(20, null)], ESCALA_DIEZ), "perdida");
  });
  it("en riesgo cuando necesitas casi la máxima; en curso si hay margen", () => {
    assert.equal(estadoMateria([ev(50, 3), ev(50, null)], ESCALA_DIEZ), "en-riesgo"); // necesitas 9
    assert.equal(estadoMateria([ev(50, 8), ev(50, null)], ESCALA_DIEZ), "en-curso"); // necesitas 4
  });
});

const materia = (nombre: string, evaluaciones: Evaluacion[], creditos = 1): Materia => ({ id: nombre, nombre, creditos, evaluaciones });

describe("promedioGeneral", () => {
  it("promedia las materias (usa el promedio parcial de las que aún no terminan)", () => {
    const m = [materia("A", [ev(100, 9)]), materia("B", [ev(50, 7), ev(50, null)])];
    assert.equal(promedioGeneral(m), 8);
  });
  it("puede tomar solo las terminadas", () => {
    const m = [materia("A", [ev(100, 9)]), materia("B", [ev(50, 7), ev(50, null)])];
    assert.equal(promedioGeneral(m, true), 9);
  });
  it("pesa por créditos", () => {
    const m = [materia("A", [ev(100, 10)], 4), materia("B", [ev(100, 6)], 1)];
    assert.equal(promedioGeneral(m), 9.2);
  });
  it("sin materias que cuenten no hay promedio", () => {
    assert.equal(promedioGeneral([]), null);
    assert.equal(promedioGeneral([materia("A", [ev(100, null)])]), null);
  });
  it("créditos que no son válidos cuentan como 1", () => {
    const m = [materia("A", [ev(100, 10)], 0), materia("B", [ev(100, 8)], -3)];
    assert.equal(promedioGeneral(m), 9);
  });
});

describe("repartirPesos y pesoSinRepartir", () => {
  it("reparte en partes iguales y suma 100", () => {
    assert.deepEqual(repartirPesos(4), [25, 25, 25, 25]);
    const tres = repartirPesos(3);
    assert.deepEqual(tres, [33.3, 33.3, 33.4]);
    assert.equal(redondear(tres.reduce((a, b) => a + b, 0), 1), 100);
  });
  it("con cero o una evaluación", () => {
    assert.deepEqual(repartirPesos(0), []);
    assert.deepEqual(repartirPesos(1), [100]);
  });
  it("lo que no se ha repartido, sin pasarse de 0", () => {
    assert.equal(pesoSinRepartir([ev(30, null), ev(20, 8)]), 50);
    assert.equal(pesoSinRepartir([ev(70, null), ev(50, null)]), 0);
    assert.equal(pesoSinRepartir([]), 100);
  });
});

describe("evaluacionesIniciales", () => {
  it("cuatro evaluaciones que suman 100 y sin calificar", () => {
    let n = 0;
    const lista = evaluacionesIniciales(() => `id${++n}`, ["Parcial 1", "Parcial 2", "Tareas", "Proyecto"]);
    assert.equal(lista.length, 4);
    assert.equal(lista.reduce((s, e) => s + e.peso, 0), 100);
    assert.ok(lista.every((e) => e.calificacion === null));
    assert.equal(new Set(lista.map((e) => e.id)).size, 4);
  });
});

describe("normalizarPromedio", () => {
  it("cualquier cosa se convierte en datos válidos (escala de 10 y sin materias)", () => {
    for (const malo of [null, undefined, "x", 5, [], { materias: 3 }]) {
      const d = normalizarPromedio(malo);
      assert.deepEqual(d.escala, ESCALA_DIEZ);
      assert.deepEqual(d.materias, []);
    }
  });
  it("conserva lo válido", () => {
    const d = normalizarPromedio({ escala: ESCALA_CIEN, materias: [{ id: "a", nombre: "Cálculo", creditos: 5, evaluaciones: [{ id: "e1", nombre: "Parcial", peso: 40, calificacion: 85 }] }] });
    assert.equal(d.escala.maximo, 100);
    assert.equal(d.materias[0]!.evaluaciones[0]!.calificacion, 85);
    assert.equal(d.materias[0]!.creditos, 5);
  });
  it("acota pesos y calificaciones, y descarta lo que no sirve", () => {
    const d = normalizarPromedio({ materias: [
      { nombre: "  Física  ", evaluaciones: [{ peso: 150, calificacion: 14 }, { peso: "x" }, null, { peso: -5, calificacion: -2 }] },
      { nombre: "" },
      "basura",
    ] });
    assert.equal(d.materias.length, 1);
    assert.equal(d.materias[0]!.nombre, "Física");
    assert.deepEqual(d.materias[0]!.evaluaciones.map((e) => [e.peso, e.calificacion]), [[100, 10], [0, 0]]);
  });
  it("los ids no se repiten", () => {
    const d = normalizarPromedio({ materias: [{ id: "a", nombre: "A" }, { id: "a", nombre: "B" }] });
    assert.notEqual(d.materias[0]!.id, d.materias[1]!.id);
  });
  it("respeta los máximos de materias y evaluaciones", () => {
    const muchas = Array.from({ length: 100 }, (_, i) => ({ nombre: `M${i}`, evaluaciones: Array.from({ length: 50 }, () => ({ peso: 1 })) }));
    const d = normalizarPromedio({ materias: muchas });
    assert.equal(d.materias.length, MAX_MATERIAS);
    assert.equal(d.materias[0]!.evaluaciones.length, MAX_EVALUACIONES);
  });
  it("el mínimo aprobatorio nunca pasa del máximo, y sin dato se adapta a la escala", () => {
    assert.equal(normalizarPromedio({ escala: { maximo: 10, minimoAprobatorio: 50 } }).escala.minimoAprobatorio, 10);
    assert.equal(normalizarPromedio({ escala: { maximo: 100 } }).escala.minimoAprobatorio, 70);
  });
});
