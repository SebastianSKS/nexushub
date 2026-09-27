import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const datos = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  },
};
const { useHorarioStore } = await import("../src/store/horario-store.ts");

const base = { materia: "Física", codigo: "", docente: "", aula: "", dia: 1, inicio: "08:00", fin: "09:40", color: "#f0812a" };
const guardado = () => JSON.parse(datos.get("nexushub-horario") ?? "[]") as { materia: string }[];

beforeEach(() => {
  datos.clear();
  useHorarioStore.setState({ cargado: false, clases: [] });
});

describe("almacén del horario", () => {
  it("guardar una clase le da id y la escribe en el almacenamiento", () => {
    useHorarioStore.getState().guardarClase(base);
    assert.equal(useHorarioStore.getState().clases.length, 1);
    assert.ok(useHorarioStore.getState().clases[0]!.id);
    assert.equal(guardado().length, 1);
  });
  it("guardar con un id que ya existe la reemplaza en vez de duplicarla", () => {
    const s = useHorarioStore.getState();
    s.guardarClase({ ...base, id: "x" });
    s.guardarClase({ ...base, id: "x", materia: "Química" });
    assert.deepEqual(guardado().map((c) => c.materia), ["Química"]);
  });
  it("quitar una clase", () => {
    const s = useHorarioStore.getState();
    s.guardarClase({ ...base, id: "x" });
    s.quitarClase("x");
    assert.equal(useHorarioStore.getState().clases.length, 0);
    assert.equal(guardado().length, 0);
  });
  it("reemplazar deja solo lo nuevo, con ids nuevos", () => {
    const s = useHorarioStore.getState();
    s.guardarClase({ ...base, id: "vieja" });
    s.reemplazar([{ ...base, materia: "Inglés" }]);
    const clases = useHorarioStore.getState().clases;
    assert.deepEqual(clases.map((c) => c.materia), ["Inglés"]);
    assert.notEqual(clases[0]!.id, "vieja");
  });
  it("agregar cuenta las nuevas y no repite las que ya tienes (aunque cambie la mayúscula)", () => {
    const s = useHorarioStore.getState();
    s.guardarClase({ ...base, id: "a" });
    const n = s.agregar([{ ...base, materia: "FÍSICA" }, { ...base, materia: "Física" }, { ...base, materia: "Química", dia: 3 }]);
    assert.equal(n, 1);
    assert.deepEqual(useHorarioStore.getState().clases.map((c) => c.materia), ["Física", "Química"]);
  });
  it("cargar valida lo guardado: descarta lo dañado", () => {
    datos.set("nexushub-horario", JSON.stringify([{ id: "1", ...base }, { id: "2", materia: "" }, "basura"]));
    useHorarioStore.getState().cargar();
    assert.equal(useHorarioStore.getState().clases.length, 1);
  });
});
