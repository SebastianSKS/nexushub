import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calificacionFinal, ESCALA_CIEN, ESCALA_DIEZ, estadoMateria, necesarioParaAprobar, pesoEvaluado, pesoPendiente, promedioParcial, puntosGanados, redondear, type Evaluacion } from "../src/lib/promedio.ts";

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
