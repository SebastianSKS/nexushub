import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// El almacén usa window.localStorage: se le da uno de mentira antes de cargarlo.
const datos = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  },
};
const { usePromedioStore, CLAVE_PROMEDIO } = await import("../src/store/promedio-store.ts");

const NOMBRES = ["Parcial 1", "Parcial 2", "Tareas", "Proyecto"] as const;
const guardado = () => JSON.parse(datos.get(CLAVE_PROMEDIO) ?? "null");

beforeEach(() => {
  datos.clear();
  usePromedioStore.setState({ cargado: false, escala: { maximo: 10, minimoAprobatorio: 6 }, materias: [] });
});

describe("almacén del promedio", () => {
  it("la clave empieza con «nexushub-»: entra en la copia de seguridad", () => {
    assert.ok(CLAVE_PROMEDIO.startsWith("nexushub-"));
  });

  it("al añadir una materia se crean sus cuatro evaluaciones y se guarda", () => {
    const id = usePromedioStore.getState().agregarMateria("  Cálculo  ", NOMBRES);
    const m = usePromedioStore.getState().materias[0]!;
    assert.equal(m.id, id);
    assert.equal(m.nombre, "Cálculo");
    assert.equal(m.evaluaciones.length, 4);
    assert.equal(guardado().materias.length, 1);
  });

  it("un nombre vacío no crea nada", () => {
    assert.equal(usePromedioStore.getState().agregarMateria("   ", NOMBRES), "");
    assert.equal(usePromedioStore.getState().materias.length, 0);
    assert.equal(datos.size, 0);
  });

  it("cambiar una calificación se refleja y se guarda", () => {
    const id = usePromedioStore.getState().agregarMateria("Física", NOMBRES);
    const ev = usePromedioStore.getState().materias[0]!.evaluaciones[0]!;
    usePromedioStore.getState().cambiarEvaluacion(id, ev.id, { calificacion: 9 });
    assert.equal(usePromedioStore.getState().materias[0]!.evaluaciones[0]!.calificacion, 9);
    assert.equal(guardado().materias[0].evaluaciones[0].calificacion, 9);
  });

  it("añadir y quitar evaluaciones y materias", () => {
    const s = usePromedioStore.getState();
    const id = s.agregarMateria("Química", NOMBRES);
    s.agregarEvaluacion(id, "Extra", 5);
    assert.equal(usePromedioStore.getState().materias[0]!.evaluaciones.length, 5);
    const primera = usePromedioStore.getState().materias[0]!.evaluaciones[0]!.id;
    s.quitarEvaluacion(id, primera);
    assert.equal(usePromedioStore.getState().materias[0]!.evaluaciones.length, 4);
    s.quitarMateria(id);
    assert.equal(usePromedioStore.getState().materias.length, 0);
    assert.equal(guardado().materias.length, 0);
  });

  it("cargar lee lo guardado, y solo una vez", () => {
    datos.set(CLAVE_PROMEDIO, JSON.stringify({ escala: { maximo: 100, minimoAprobatorio: 70 }, materias: [{ id: "a", nombre: "Álgebra", creditos: 3, evaluaciones: [] }] }));
    usePromedioStore.getState().cargar();
    assert.equal(usePromedioStore.getState().materias[0]!.nombre, "Álgebra");
    assert.equal(usePromedioStore.getState().escala.maximo, 100);
    datos.set(CLAVE_PROMEDIO, "{}");
    usePromedioStore.getState().cargar();
    assert.equal(usePromedioStore.getState().materias.length, 1); // ya estaba cargado: no lo vuelve a leer
  });

  it("lo dañado no rompe: arranca vacío", () => {
    datos.set(CLAVE_PROMEDIO, "{esto no es json");
    usePromedioStore.getState().cargar();
    assert.deepEqual(usePromedioStore.getState().materias, []);
  });

  it("cambiar la escala ajusta las calificaciones y se guarda", () => {
    const s = usePromedioStore.getState();
    s.cambiarEscala({ maximo: 100, minimoAprobatorio: 70 });
    const id = s.agregarMateria("Redes", NOMBRES);
    const ev = usePromedioStore.getState().materias[0]!.evaluaciones[0]!;
    s.cambiarEvaluacion(id, ev.id, { calificacion: 90 });
    s.cambiarEscala({ maximo: 10, minimoAprobatorio: 6 });
    assert.equal(usePromedioStore.getState().materias[0]!.evaluaciones[0]!.calificacion, 10);
    assert.equal(guardado().escala.maximo, 10);
  });
});
