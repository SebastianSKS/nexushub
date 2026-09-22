// Next.js 16 (en Windows) exporta el RSC de cada ruta como "<ruta>/index.txt" (anidado), pero el
// router del cliente, al navegar con clic (no con prefetch), pide "<ruta>.txt" (plano, junto a la
// carpeta). Sin ese archivo, cada clic falla con 404 y Next cae a una recarga completa de página, que
// además reinicia el video y la música. Bug conocido de Next 16 + output:"export" en Windows
// (arreglo oficial: un "build adapter" experimental; aquí se corrige copiando los archivos que faltan).
import { readdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "out");

async function recorrer(dir) {
  let copiados = 0;
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (!entrada.isDirectory()) continue;
    const carpeta = path.join(dir, entrada.name);
    const anidado = path.join(carpeta, "index.txt");
    const plano = `${carpeta}.txt`;
    try {
      await stat(anidado);
      await copyFile(anidado, plano);
      copiados++;
    } catch {
      /* esta carpeta no es una ruta con RSC (p. ej. _next): se ignora */
    }
    copiados += await recorrer(carpeta);
  }
  return copiados;
}

const total = await recorrer(OUT);
console.log(`[arreglar-exportacion] ${total} archivo(s) .txt plano(s) generados para la navegación del cliente.`);
