// Ayuda para no dejar textos en español sin marcar: lista los que parecen texto para el usuario y NO están dentro de t("…"),
// traducir("…") ni T("…"). Es una búsqueda por indicios (acentos, ¿ ¡ y palabras muy españolas), así que puede señalar de más:
// úsala como lista de revisión, no como regla.
//
// Uso: node scripts/buscar-textos-sin-traducir.mjs [carpeta-o-archivo …]      (sin argumentos, todo src/)
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..");
const PALABRAS = /\b(el|la|los|las|de|del|que|para|tu|tus|con|una|un|se|no|en|por|al|es|hay|sin|si|más|como|puedes|elige|abre|guardar|cancelar|aceptar|cerrar|nuevo|nueva|todo|toda|aún|ya)\b/i;

async function archivos(ruta) {
  const info = await stat(ruta);
  if (info.isFile()) return [ruta];
  const salida = [];
  for (const e of await readdir(ruta, { withFileTypes: true })) {
    if (e.name === "en" && ruta.endsWith("i18n")) continue;
    const hijo = path.join(ruta, e.name);
    if (e.isDirectory()) salida.push(...(await archivos(hijo)));
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) salida.push(hijo);
  }
  return salida;
}

const parecenEspanol = (texto) => {
  const t = texto.trim();
  if (t.length < 3 || /^[\w./:#@%${}\-\s]+$/.test(t) && !PALABRAS.test(t)) return false;
  if (/[áéíóúñÁÉÍÓÚÑ¿¡«»]/.test(t)) return true;
  return t.split(/\s+/).length >= 2 && PALABRAS.test(t);
};

const objetivos = process.argv.slice(2).length ? process.argv.slice(2).map((p) => path.resolve(p)) : [path.join(RAIZ, "src")];
let total = 0;
for (const objetivo of objetivos) {
  for (const archivo of await archivos(objetivo)) {
    if (archivo.includes(`${path.sep}lib${path.sep}i18n${path.sep}`)) continue;
    const lineas = (await readFile(archivo, "utf8")).split("\n");
    let enBloque = false;
    lineas.forEach((linea, i) => {
      const suelta = linea.trim();
      if (enBloque) {
        if (suelta.includes("*/")) enBloque = false;
        return;
      }
      if (suelta.startsWith("/*")) {
        if (!suelta.includes("*/")) enBloque = true;
        return;
      }
      if (suelta.startsWith("//") || suelta.startsWith("*")) return;
      const sinComentario = linea.replace(/\s\/\/.*$/, "").replace(/\{\/\*.*?\*\/\}/g, "");
      // Se quita lo que ya está marcado.
      const sinMarcados = sinComentario.replace(/(?<![\w.$])(?:t|traducir|T)\(\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, "");
      const candidatos = [];
      for (const m of sinMarcados.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) candidatos.push(m[1] ?? m[2] ?? m[3]);
      // Texto suelto entre etiquetas: <p>Hola</p> o una línea de solo texto dentro de JSX.
      for (const m of sinMarcados.matchAll(/>([^<>{}]+)</g)) candidatos.push(m[1]);
      if (/^\s*[A-Za-zÁÉÍÓÚáéíóúñ¿¡][^<>{}=;()]*$/.test(sinMarcados) && !/^\s*(import|export|const|let|return|type|interface|case|default)\b/.test(sinMarcados)) candidatos.push(sinMarcados);
      for (const c of candidatos) {
        if (parecenEspanol(c) && !/^(https?:|\/|\.|@|#)/.test(c.trim()) && !/className|aria-|import /.test(c)) {
          console.log(`${path.relative(RAIZ, archivo)}:${i + 1}  ${c.trim().slice(0, 100)}`);
          total++;
        }
      }
    });
  }
}
console.log(`\n${total} texto(s) que parecen sin marcar.`);
