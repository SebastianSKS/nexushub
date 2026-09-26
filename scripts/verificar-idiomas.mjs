// Revisa que todo lo que Nexo dice en español tenga su traducción al inglés.
//
// Busca en el código cada texto marcado para traducir —t("…"), traducir("…") y T("…")— y comprueba contra los
// archivos src/lib/i18n/en/*.json (el texto en español es la clave). Falla (código de salida 1) si:
//   - un texto marcado no tiene traducción al inglés,
//   - una traducción no conserva los {marcadores} de la clave ({nombre}, {n}…),
//   - la misma clave está en dos archivos con traducciones distintas, o una traducción está vacía.
// Solo avisa (sin fallar) de las traducciones que ya nadie usa.
//
// Uso: node scripts/verificar-idiomas.mjs        (o: npm run i18n:check)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..");
const SRC = path.join(RAIZ, "src");
const CARPETA_EN = path.join(SRC, "lib", "i18n", "en");

async function archivos(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await archivos(ruta)));
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) salida.push(ruta);
  }
  return salida;
}

/** t("…"), traducir('…'), T(`…`): solo llamadas con el texto escrito ahí mismo (sin ${}). */
const LLAMADA = /(?<![\w.$])(?:t|tr|traducir|T)\(\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.|\$(?!\{))*)`)/g;

const desescapar = (s) => s.replace(/\\(n|t|"|'|`|\\|\$)/g, (_, c) => ({ n: "\n", t: "\t" })[c] ?? c);
const marcadores = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const usados = new Map(); // clave -> "archivo:línea"
for (const archivo of await archivos(SRC)) {
  const original = await readFile(archivo, "utf8");
  // Sin comentarios (ahí hay ejemplos como t("Guardar") que no son textos de la aplicación), pero conservando los saltos de línea para dar bien el número.
  const codigo = original.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " ")).replace(/(^|\s)\/\/.*$/gm, "$1");
  for (const m of codigo.matchAll(LLAMADA)) {
    const clave = desescapar(m[1] ?? m[2] ?? m[3]);
    if (!usados.has(clave)) usados.set(clave, `${path.relative(RAIZ, archivo)}:${codigo.slice(0, m.index).split("\n").length}`);
  }
}

const traducciones = new Map(); // clave -> { valor, archivo }
const errores = [];
for (const nombre of (await readdir(CARPETA_EN)).filter((f) => f.endsWith(".json")).sort()) {
  const datos = JSON.parse(await readFile(path.join(CARPETA_EN, nombre), "utf8"));
  for (const [clave, valor] of Object.entries(datos)) {
    if (typeof valor !== "string" || !valor.trim()) errores.push(`${nombre}: la traducción de «${clave}» está vacía`);
    const previa = traducciones.get(clave);
    if (previa && previa.valor !== valor) errores.push(`«${clave}» está en ${previa.archivo} y en ${nombre} con traducciones distintas`);
    traducciones.set(clave, { valor, archivo: nombre });
    if (typeof valor === "string" && marcadores(clave) !== marcadores(valor)) errores.push(`${nombre}: «${clave}» y su traducción no tienen los mismos {marcadores}`);
  }
}

const faltan = [...usados].filter(([clave]) => !traducciones.has(clave));
for (const [clave, donde] of faltan) errores.push(`Falta la traducción al inglés de «${clave}» (${donde})`);

const sobran = [...traducciones.keys()].filter((clave) => !usados.has(clave));

console.log(`Textos marcados: ${usados.size} · traducidos: ${usados.size - faltan.length}${sobran.length ? ` · traducciones sin uso: ${sobran.length}` : ""}`);
if (sobran.length && process.argv.includes("--sin-uso")) for (const c of sobran) console.log(`  (sin uso) ${c}`);
if (errores.length) {
  console.error(`\n${errores.length} problema(s):`);
  for (const e of errores) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("Todo traducido.");
