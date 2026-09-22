// Arma el "latest.json" que las actualizaciones automáticas necesitan encontrar en GitHub Releases.
// Se ejecuta DESPUÉS de "npm run tauri:build" (firmado: ver ACTUALIZACIONES.md), y lee el número de
// versión y el repositorio directamente de tauri.conf.json, para no tener que escribirlos dos veces.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..");
const conf = JSON.parse(await readFile(path.join(RAIZ, "src-tauri", "tauri.conf.json"), "utf8"));
const version = conf.version;
const endpoint = conf.plugins?.updater?.endpoints?.[0] ?? "";
const coincide = endpoint.match(/github\.com\/([^/]+)\/([^/]+)\//);

if (!coincide) {
  console.error("No encontré un repositorio de GitHub en plugins.updater.endpoints de tauri.conf.json.");
  process.exit(1);
}
const [, owner, repo] = coincide;

const instalador = `NexusHub_${version}_x64-setup.exe`;
const carpeta = path.join(RAIZ, "src-tauri", "target", "release", "bundle", "nsis");
const rutaFirma = path.join(carpeta, `${instalador}.sig`);

let firma;
try {
  firma = (await readFile(rutaFirma, "utf8")).trim();
} catch {
  console.error(`No encontré "${rutaFirma}". Compila con las variables TAURI_SIGNING_PRIVATE_KEY* puestas (ver ACTUALIZACIONES.md).`);
  process.exit(1);
}

const latest = {
  version,
  notes: process.argv[2] ?? `NexusHub ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: firma,
      url: `https://github.com/${owner}/${repo}/releases/download/v${version}/${instalador}`,
    },
  },
};

const destino = path.join(carpeta, "latest.json");
await writeFile(destino, JSON.stringify(latest, null, 2));
console.log(`[generar-latest-json] Escrito en ${destino}`);
console.log(`Sube estos 3 archivos a un Release "v${version}" en github.com/${owner}/${repo}:`);
console.log(`  - ${instalador}`);
console.log(`  - ${instalador}.sig`);
console.log(`  - latest.json`);
