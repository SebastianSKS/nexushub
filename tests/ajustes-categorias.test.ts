import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { AJUSTES, buscarAjustes, CATEGORIAS, categoriaDe, rutaAjustes } from "../src/lib/ajustes-categorias.ts";
import { rutaValida } from "../src/lib/rutas.ts";

const igual = (s: string) => s;
const nombres = (texto: string, escritorio = true) => buscarAjustes(texto, igual, escritorio).map((h) => (h.tipo === "categoria" ? `[${h.categoria.id}]` : h.ajuste.id));
const pagina = readFileSync("src/modules/configuracion/PaginaConfiguracion.tsx", "utf8");

describe("configuración por categorías", () => {
  it("cada ajuste del buscador tiene su lugar marcado en la pantalla, una sola vez", () => {
    const marcados = [...pagina.matchAll(/<Ancla id="([^"]+)"/g)].map((m) => m[1]!);
    assert.equal(new Set(marcados).size, marcados.length, "hay anclas repetidas");
    // «Restaurar desde una copia» comparte componente (y ancla) con «Guardar una copia».
    const buscables = AJUSTES.map((a) => a.id).filter((id) => id !== "restaurar-copia");
    assert.deepEqual([...buscables].sort(), [...marcados].sort());
  });

  it("cada ajuste está en el panel de la categoría que dice", () => {
    const inicio = pagina.indexOf("const paneles");
    const paneles = pagina.slice(inicio, pagina.indexOf("\n  };\n", inicio));
    const partes = paneles.split(/\n    (?=[a-z]+: \()/).slice(1);
    assert.deepEqual(partes.map((p) => p.slice(0, p.indexOf(":"))), CATEGORIAS.map((c) => c.id));
    for (const parte of partes) {
      const categoria = parte.slice(0, parte.indexOf(":"));
      for (const m of parte.matchAll(/<Ancla id="([^"]+)"/g)) assert.equal(AJUSTES.find((a) => a.id === m[1])?.categoria, categoria, m[1]);
    }
  });

  it("cada categoría tiene al menos un ajuste y los identificadores no se repiten", () => {
    for (const c of CATEGORIAS) assert.ok(AJUSTES.some((a) => a.categoria === c.id), c.id);
    assert.equal(new Set(AJUSTES.map((a) => a.id)).size, AJUSTES.length);
  });

  it("las direcciones son válidas y una categoría inventada no existe", () => {
    assert.equal(rutaAjustes("apariencia"), "/configuracion?categoria=apariencia");
    assert.equal(rutaAjustes("apariencia", "tema"), "/configuracion?categoria=apariencia&ajuste=tema");
    assert.ok(rutaValida(rutaAjustes("avisos", "sonido")));
    assert.equal(categoriaDe("nada"), null);
    assert.equal(categoriaDe(null), null);
  });
});

describe("buscar en configuración", () => {
  it("el nombre de una categoría lleva a esa categoría, no a todo lo que tiene dentro", () => {
    assert.deepEqual(nombres("apariencia"), ["[apariencia]"]);
    assert.equal(nombres("Aparien")[0], "[apariencia]");
  });

  it("encuentra un ajuste por su nombre o por cómo lo llamaría alguien", () => {
    assert.ok(nombres("tema").includes("tema"));
    assert.ok(nombres("modo oscuro").includes("tema"));
    assert.ok(nombres("idioma").includes("idioma"));
    assert.ok(nombres("dark mode").includes("tema"));
    assert.ok(nombres("notificaciones").includes("[avisos]"));
    assert.equal(nombres("color")[0], "acento");
  });

  it("solo cuenta el comienzo de las palabras y sin acentos", () => {
    assert.ok(!nombres("hora").includes("tema"));
    assert.ok(nombres("animacion").includes("animaciones"));
  });

  it("en la web no ofrece lo que solo está en la aplicación de escritorio", () => {
    assert.ok(nombres("iniciar con windows").includes("inicio-windows"));
    assert.ok(!nombres("iniciar con windows", false).includes("inicio-windows"));
  });

  it("con una letra o sin nada no busca", () => {
    assert.deepEqual(nombres("a"), []);
    assert.deepEqual(nombres("   "), []);
    assert.deepEqual(nombres("zzzz"), []);
  });

  it("ningún componente enlaza ya a la página entera con «#»", () => {
    const archivos = readdirSync("src", { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));
    for (const f of archivos) assert.ok(!readFileSync(`src/${f}`, "utf8").includes("/configuracion#"), f);
  });
});
