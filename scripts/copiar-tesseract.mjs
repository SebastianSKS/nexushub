// Copia a public/tesseract lo que el lector de imágenes (OCR) necesita en tiempo de ejecución: el trabajador,
// el motor (en sus variantes según lo que admita el equipo) y el idioma español. Así funciona sin internet y
// no hace falta guardar estos archivos (14 MB) en Git: se vuelven a copiar en cada `dev` y `build`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "tesseract");
const nm = join(raiz, "node_modules");

const archivos = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz", "lang/spa.traineddata.gz"],
];

for (const [origen, salida] of archivos) {
  const desde = join(nm, origen);
  const hasta = join(destino, salida);
  if (!existsSync(desde)) {
    console.error(`Falta ${origen}: ejecuta «npm install».`);
    process.exit(1);
  }
  mkdirSync(dirname(hasta), { recursive: true });
  copyFileSync(desde, hasta);
}
console.log("OCR: archivos copiados a public/tesseract");
