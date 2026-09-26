// Ganchos de Node para las pruebas: entienden el alias «@/…» de tsconfig (→ src/…) y los JSON sin atributo de importación,
// para poder probar el código que usa esas dos cosas (fechas, horario, ics, rangos…) sin compilar nada.
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..", "src");

const EXTENSIONES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** El archivo de código que corresponde a una ruta sin extensión (como las resuelve TypeScript), o null. */
function buscar(base) {
  for (const ext of EXTENSIONES) {
    const candidato = base + ext;
    if (existsSync(candidato) && statSync(candidato).isFile() && /\.(tsx?|json)$/.test(candidato)) return candidato;
  }
  return null;
}

export async function resolve(specifier, contexto, siguiente) {
  let base = null;
  if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && contexto.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(contexto.parentURL)), specifier);
  const encontrado = base && buscar(base);
  if (encontrado) return { url: pathToFileURL(encontrado).href, shortCircuit: true };
  return siguiente(specifier, contexto);
}

export async function load(url, contexto, siguiente) {
  if (url.endsWith(".json") && url.startsWith("file:")) {
    const texto = readFileSync(new URL(url), "utf8");
    return { format: "module", source: `export default ${texto};`, shortCircuit: true };
  }
  return siguiente(url, contexto);
}
