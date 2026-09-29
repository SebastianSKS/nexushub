// Revisa una versión de Nexo antes (y después) de publicarla, para no dejar a nadie sin poder actualizar.
//
//   npm run release:verificar            → lo que se compiló aquí: versiones, firma del instalador y latest.json
//   npm run release:verificar -- --remoto → lo que YA está publicado en GitHub: baja latest.json y el instalador, como haría
//                                            una copia de Nexo, y comprueba la firma con la llave de tauri.conf.json
//
// Sale con código 1 si algo está mal. Las reglas viven en src/lib/release.ts (con pruebas).
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  problemasDeLatest,
  verificarFirma,
  versionDeCargoLock,
  versionDeCargoToml,
  versionesQueNoCoinciden,
} from "../src/lib/release.ts";

const RAIZ = path.join(import.meta.dirname, "..");
const remoto = process.argv.includes("--remoto");
const leer = (...p) => readFile(path.join(RAIZ, ...p), "utf8");

let fallos = 0;
const bien = (t) => console.log(`  ✔ ${t}`);
const mal = (t) => {
  fallos++;
  console.log(`  ✗ ${t}`);
};

const conf = JSON.parse(await leer("src-tauri", "tauri.conf.json"));
const version = conf.version;
const pubkey = conf.plugins?.updater?.pubkey;
const endpoint = conf.plugins?.updater?.endpoints?.[0];
const instalador = `Nexo_${version}_x64-setup.exe`;
const appimage = `Nexo_${version}_x86_64.AppImage`;
console.log(`Nexo ${version} — ${remoto ? "lo publicado en GitHub" : "lo compilado aquí"}`);

// 1) Los números de versión.
console.log("\nVersión");
const paquete = JSON.parse(await leer("package.json")).version;
const bloqueo = JSON.parse(await leer("package-lock.json"));
const aparte = versionesQueNoCoinciden({
  packageJson: paquete,
  tauriConf: version,
  cargoToml: versionDeCargoToml(await leer("src-tauri", "Cargo.toml")),
  packageLock: `${bloqueo.version}/${bloqueo.packages?.[""]?.version}` === `${version}/${version}` ? version : `${bloqueo.version}/${bloqueo.packages?.[""]?.version}`,
  cargoLock: versionDeCargoLock(await leer("src-tauri", "Cargo.lock"), "nexushub"),
});
if (aparte.length === 0) bien(`package.json, tauri.conf.json, Cargo.toml y los dos «lock» dicen ${version}`);
else aparte.forEach((x) => mal(x));

if (!remoto) {
  // 2) Las novedades de esa versión (lo que ve quien actualiza).
  const novedades = await leer("src", "lib", "novedades.ts");
  if (novedades.includes(`version: "${version}"`)) bien(`hay novedades escritas para la ${version} (src/lib/novedades.ts)`);
  else mal(`no hay novedades para la ${version} en src/lib/novedades.ts: quien actualice no verá qué cambió`);
}

// 3) La firma.
console.log("\nInstalador y firma");
let bytes;
let firma;
if (remoto) {
  const res = await fetch(endpoint, { headers: { "User-Agent": "nexo-verificar" } });
  if (!res.ok) {
    mal(`no se pudo bajar latest.json (${res.status}) de ${endpoint}`);
  } else {
    const latest = await res.json();
    console.log(`  ·  latest.json publicado: versión ${latest.version}`);
    if (latest.version !== version) mal(`lo publicado es la ${latest.version}, no la ${version} de este proyecto (¿aún no se publicó, o se olvidó subir la versión?)`);
    const p = latest.platforms?.["windows-x86_64"];
    const problemas = problemasDeLatest(latest, version);
    problemas.forEach((x) => mal(`latest.json: ${x}`));
    if (problemas.length === 0) bien("latest.json tiene el formato correcto y apunta al instalador de esta versión");
    console.log(`  ·  plataformas publicadas: ${Object.keys(latest.platforms ?? {}).join(", ") || "ninguna"}`);
    if (!latest.platforms?.["linux-x86_64"]) console.log("  ·  sin linux-x86_64: en Linux habrá que bajar la versión a mano");
    if (p?.url) {
      const inst = await fetch(p.url, { headers: { "User-Agent": "nexo-verificar" }, redirect: "follow" });
      if (!inst.ok) mal(`el instalador no se puede bajar (${inst.status}): ${p.url}`);
      else {
        bytes = new Uint8Array(await inst.arrayBuffer());
        bien(`el instalador se baja bien (${(bytes.length / 1048576).toFixed(1)} MB)`);
        firma = p.signature;
      }
    }
  }
} else {
  const carpeta = ["src-tauri", "target", "release", "bundle", "nsis"];
  try {
    bytes = await readFile(path.join(RAIZ, ...carpeta, instalador));
    bien(`existe ${instalador} (${(bytes.length / 1048576).toFixed(1)} MB)`);
  } catch {
    mal(`no existe ${instalador}: compila primero (npm run tauri:build, ver ACTUALIZACIONES.md)`);
  }
  let firmaArchivo;
  const firmas = {};
  try {
    firmaArchivo = (await readFile(path.join(RAIZ, ...carpeta, `${instalador}.sig`), "utf8")).trim();
    firmas["windows-x86_64"] = firmaArchivo;
    bien(`existe ${instalador}.sig`);
  } catch {
    mal(`no existe ${instalador}.sig: compilaste sin la llave de firma`);
  }
  firma = firmaArchivo;
  // El AppImage se compila en Linux, así que solo se comprueba si el de esta compilación está en esta máquina.
  const carpetaLinux = ["src-tauri", "target", "release", "bundle", "appimage"];
  try {
    firmas["linux-x86_64"] = (await readFile(path.join(RAIZ, ...carpetaLinux, `${appimage}.sig`), "utf8")).trim();
    bien(`existe ${appimage}.sig`);
  } catch {
    console.log(`  ·  sin ${appimage}.sig aquí: si lo compilaste en otro equipo, revisa que su firma esté en latest.json`);
  }
  try {
    const latest = JSON.parse(await readFile(path.join(RAIZ, ...carpeta, "latest.json"), "utf8"));
    const problemas = problemasDeLatest(latest, version, firmas);
    problemas.forEach((x) => mal(`latest.json: ${x}`));
    if (problemas.length === 0) bien("latest.json: versión, dirección https, firma y fecha correctas");
  } catch {
    mal("no existe latest.json: genéralo con npm run release:manifest");
  }
}
if (bytes && firma) {
  const r = verificarFirma(bytes, firma, pubkey);
  if (r.ok) bien(`la firma es de nuestra llave y corresponde a este instalador (${r.comentario?.replace(/\t/g, " · ")})`);
  else mal(`firma: ${r.motivo}`);
}

console.log(fallos === 0 ? "\nTodo en orden: se puede publicar y las copias de Nexo podrán actualizarse." : `\n${fallos} problema(s): NO publiques hasta arreglarlos.`);
process.exit(fallos === 0 ? 0 : 1);
