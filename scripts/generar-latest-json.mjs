// Arma el "latest.json" que las actualizaciones automáticas necesitan encontrar en GitHub Releases.
// Se ejecuta DESPUÉS de "npm run tauri:build" (firmado: ver ACTUALIZACIONES.md), y lee el número de
// versión y el repositorio directamente de tauri.conf.json, para no tener que escribirlos dos veces.
//
// Linux: el AppImage se compila y firma en un equipo Linux, así que su firma no suele estar en la misma carpeta que
// la de Windows. Se pasa con --linux-sig <archivo> (o con la variable LINUX_SIG) y entonces latest.json trae además
// la entrada "linux-x86_64", que es lo que el actualizador de Tauri mira en Linux. Sin esa firma, el release solo
// actualiza en Windows: es válido, pero quien tenga Nexo en Linux tendrá que bajar la versión a mano.
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

// Argumentos: el primero que no sea bandera son las notas del release; --linux-sig <archivo> añade la firma de Linux.
const argumentos = process.argv.slice(2);
let notas;
let rutaFirmaLinux = process.env.LINUX_SIG;
for (let i = 0; i < argumentos.length; i++) {
  if (argumentos[i] === "--linux-sig") rutaFirmaLinux = argumentos[++i];
  else notas ??= argumentos[i];
}

const instalador = `Nexo_${version}_x64-setup.exe`;
const carpeta = path.join(RAIZ, "src-tauri", "target", "release", "bundle", "nsis");
const rutaFirma = path.join(carpeta, `${instalador}.sig`);

const leerFirma = async (de) => {
  try {
    return (await readFile(de, "utf8")).trim();
  } catch {
    console.error(`No encontré "${de}".`);
    return null;
  }
};

const firma = await leerFirma(rutaFirma);
if (!firma) {
  console.error(`Compila con las variables TAURI_SIGNING_PRIVATE_KEY* puestas (ver ACTUALIZACIONES.md).`);
  process.exit(1);
}

const appimage = `Nexo_${version}_x86_64.AppImage`;
const plataformas = {
  "windows-x86_64": {
    signature: firma,
    url: `https://github.com/${owner}/${repo}/releases/download/v${version}/${instalador}`,
  },
};

let suben = [`${instalador}`, `${instalador}.sig`];
if (rutaFirmaLinux) {
  const firmaLinux = await leerFirma(rutaFirmaLinux);
  if (!firmaLinux) process.exit(1);
  plataformas["linux-x86_64"] = {
    signature: firmaLinux,
    url: `https://github.com/${owner}/${repo}/releases/download/v${version}/${appimage}`,
  };
  suben = [...suben, appimage, `${appimage}.sig`];
}

const latest = {
  version,
  notes: notas ?? `Nexo ${version}`,
  pub_date: new Date().toISOString(),
  platforms,
};

const destino = path.join(carpeta, "latest.json");
await writeFile(destino, JSON.stringify(latest, null, 2));
console.log(`[generar-latest-json] Escrito en ${destino}`);
console.log(rutaFirmaLinux ? "Linux incluido (linux-x86_64)." : "Sin entrada de Linux: quien lo use tendrá que actualizar a mano. Pásale --linux-sig si tienes la firma del AppImage.");
console.log(`Sube estos ${suben.length + 1} archivos a un Release "v${version}" en github.com/${owner}/${repo}:`);
for (const archivo of [...suben, "latest.json"]) console.log(`  - ${archivo}`);
