import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NOVEDADES } from "../src/lib/novedades.ts";
import { versionDeCargoLock, versionDeCargoToml, versionesQueNoCoinciden } from "../src/lib/release.ts";

const leer = (ruta: string) => readFileSync(ruta, "utf8");
const conf = JSON.parse(leer("src-tauri/tauri.conf.json")) as { version: string };
const paquete = JSON.parse(leer("package.json")) as { version: string };
const bloqueo = JSON.parse(leer("package-lock.json")) as { version: string; packages: Record<string, { version?: string }> };

describe("la versión del proyecto", () => {
  it("es la misma en todos los archivos donde vive (así una versión a medio subir no llega a compilarse)", () => {
    const aparte = versionesQueNoCoinciden({
      packageJson: paquete.version,
      tauriConf: conf.version,
      cargoToml: versionDeCargoToml(leer("src-tauri/Cargo.toml")),
      packageLock: bloqueo.version === bloqueo.packages[""]?.version ? bloqueo.version : `${bloqueo.version}/${bloqueo.packages[""]?.version}`,
      cargoLock: versionDeCargoLock(leer("src-tauri/Cargo.lock"), "nexushub"),
    });
    assert.deepEqual(aparte, []);
  });

  it("tiene sus novedades escritas: quien actualice verá qué cambió", () => {
    assert.ok(NOVEDADES.some((n) => n.version === conf.version), `falta la entrada ${conf.version} en src/lib/novedades.ts`);
  });

  it("es una versión con tres números", () => {
    assert.match(conf.version, /^\d+\.\d+\.\d+$/);
  });
});
