import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { leerLlavePublica, problemasDeLatest, verificarFirma, versionDeCargoLock, versionDeCargoToml, versionesQueNoCoinciden } from "../src/lib/release.ts";

/** Una llave y una firma «de mentira» pero con el formato exacto de minisign, para probar el verificador sin la llave de verdad. */
function firmar(contenido: Buffer, comentario = "timestamp:1\tfile:Nexo_9.9.9_x64-setup.exe\tversion:9.9.9", algoritmo: "ED" | "Ed" = "ED") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const cruda = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const idLlave = Buffer.from("0123456789abcdef", "hex");
  const b64 = (b: Buffer) => b.toString("base64");
  const pubkey = b64(Buffer.from(`untrusted comment: minisign public key: X\n${b64(Buffer.concat([Buffer.from("Ed"), idLlave, cruda]))}\n`));
  const mensaje = algoritmo === "ED" ? createHash("blake2b512").update(contenido).digest() : contenido;
  const firmaCruda = sign(null, mensaje, privateKey);
  const global = sign(null, Buffer.concat([firmaCruda, Buffer.from(comentario)]), privateKey);
  const archivo = `untrusted comment: signature from tauri secret key\n${b64(Buffer.concat([Buffer.from(algoritmo), idLlave, firmaCruda]))}\ntrusted comment: ${comentario}\n${b64(global)}\n`;
  return { pubkey, firma: b64(Buffer.from(archivo)), idLlave };
}

describe("verificarFirma", () => {
  const instalador = Buffer.from("contenido del instalador ".repeat(1000));

  it("acepta una firma buena (resumen BLAKE2b, la que usa Tauri)", () => {
    const { pubkey, firma } = firmar(instalador);
    const r = verificarFirma(instalador, firma, pubkey);
    assert.ok(r.ok, r.motivo ?? "firma inválida");
    assert.match(r.comentario ?? "", /version:9\.9\.9/);
  });

  it("acepta también la variante sin resumen", () => {
    const { pubkey, firma } = firmar(instalador, "x", "Ed");
    assert.equal(verificarFirma(instalador, firma, pubkey).ok, true);
  });

  it("rechaza un instalador que cambió después de firmarse", () => {
    const { pubkey, firma } = firmar(instalador);
    const cambiado = Buffer.from(instalador);
    cambiado[10] ^= 1;
    const r = verificarFirma(cambiado, firma, pubkey);
    assert.equal(r.ok, false);
    assert.match(r.motivo ?? "", /NO corresponde/);
  });

  it("rechaza una firma hecha con otra llave", () => {
    const a = firmar(instalador);
    const b = firmar(instalador);
    const r = verificarFirma(instalador, a.firma, b.pubkey);
    assert.equal(r.ok, false);
  });

  it("rechaza un comentario de firma alterado (otra versión)", () => {
    const { pubkey, firma } = firmar(instalador, "version:1.0.0");
    const texto = Buffer.from(firma, "base64").toString().replace("version:1.0.0", "version:6.6.6");
    const r = verificarFirma(instalador, Buffer.from(texto).toString("base64"), pubkey);
    assert.equal(r.ok, false);
    assert.match(r.motivo ?? "", /comentario/);
  });

  it("no revienta con basura", () => {
    const { pubkey } = firmar(instalador);
    assert.equal(verificarFirma(instalador, "no es una firma", pubkey).ok, false);
    assert.equal(verificarFirma(instalador, "", "tampoco").ok, false);
  });

  it("con la llave y la firma reales de la última compilación, si están aquí", { skip: !existsSync("src-tauri/target/release/bundle/nsis/latest.json") }, () => {
    const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as { version: string; plugins: { updater: { pubkey: string } } };
    const carpeta = "src-tauri/target/release/bundle/nsis";
    const exe = `${carpeta}/Nexo_${conf.version}_x64-setup.exe`;
    if (!existsSync(exe)) return; // aún no se compiló esta versión
    const r = verificarFirma(readFileSync(exe), readFileSync(`${exe}.sig`, "utf8"), conf.plugins.updater.pubkey);
    assert.ok(r.ok, r.motivo ?? "firma inválida");
  });
});

describe("leerLlavePublica", () => {
  it("lee la llave de tauri.conf.json y da su identificador", () => {
    const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as { plugins: { updater: { pubkey: string } } };
    const llave = leerLlavePublica(conf.plugins.updater.pubkey);
    assert.match(llave.idLlave, /^[0-9a-f]{16}$/);
    assert.equal(llave.cruda.length, 32);
  });
  it("rechaza lo que no es una llave de minisign", () => {
    assert.throws(() => leerLlavePublica(Buffer.from("hola").toString("base64")));
  });
});

describe("versiones", () => {
  it("avisa de los archivos que no coinciden con tauri.conf.json", () => {
    const ok = { packageJson: "0.1.4", tauriConf: "0.1.4", cargoToml: "0.1.4", packageLock: "0.1.4", cargoLock: "0.1.4" };
    assert.deepEqual(versionesQueNoCoinciden(ok), []);
    const mal = versionesQueNoCoinciden({ ...ok, cargoToml: "0.1.3", packageLock: "" });
    assert.equal(mal.length, 2);
    assert.match(mal[0]!, /cargoToml: 0\.1\.3/);
    assert.match(mal[1]!, /no encontrada/);
  });
  it("lee la versión de Cargo.toml y de Cargo.lock", () => {
    assert.equal(versionDeCargoToml('[package]\nname = "x"\nversion = "1.2.3"\n\n[dependencies]\nversion = "9"'), "1.2.3");
    assert.equal(versionDeCargoLock('[[package]]\nname = "otro"\nversion = "9.9.9"\n\n[[package]]\nname = "nexushub"\nversion = "1.2.3"\n', "nexushub"), "1.2.3");
    assert.equal(versionDeCargoLock("", "nexushub"), "");
  });
});

describe("problemasDeLatest", () => {
  const firma = "x".repeat(200);
  const bueno = { version: "0.1.4", pub_date: "2026-09-26T08:02:25.664Z", platforms: { "windows-x86_64": { signature: firma, url: "https://github.com/SebastianSKS/nexushub/releases/download/v0.1.4/Nexo_0.1.4_x64-setup.exe" } } };
  const conLinux = { ...bueno, platforms: { ...bueno.platforms, "linux-x86_64": { signature: "y".repeat(200), url: "https://github.com/SebastianSKS/nexushub/releases/download/v0.1.4/Nexo_0.1.4_x86_64.AppImage" } } };

  it("un latest.json correcto no tiene problemas", () => {
    assert.deepEqual(problemasDeLatest(bueno, "0.1.4", { "windows-x86_64": firma }), []);
  });
  it("acepta las otras plataformas que traiga el release", () => {
    assert.deepEqual(problemasDeLatest(conLinux, "0.1.4", { "windows-x86_64": firma, "linux-x86_64": "y".repeat(200) }), []);
  });
  it("detecta versión, url, firma y plataforma malas", () => {
    assert.equal(problemasDeLatest({ ...bueno, version: "0.1.3" }, "0.1.4").length, 1);
    assert.match(problemasDeLatest({ ...bueno, platforms: { "windows-x86_64": { ...bueno.platforms["windows-x86_64"], url: "http://x/Nexo_0.1.4_x64-setup.exe" } } }, "0.1.4").join(), /https/);
    assert.match(problemasDeLatest(bueno, "0.1.4", { "windows-x86_64": "otra firma" }).join(), /no es la del archivo/);
    assert.match(problemasDeLatest({ version: "0.1.4", pub_date: bueno.pub_date, platforms: {} }, "0.1.4").join(), /windows-x86_64/);
  });
  it("una url que apunta a otra versión no vale, tampoco en Linux", () => {
    const mala = { ...conLinux, platforms: { ...conLinux.platforms, "linux-x86_64": { ...conLinux.platforms["linux-x86_64"], url: "https://github.com/SebastianSKS/nexushub/releases/download/v0.1.3/Nexo_0.1.4_x86_64.AppImage" } } };
    assert.match(problemasDeLatest(mala, "0.1.4").join(), /linux-x86_64: la url no apunta/);
  });
  it("una plataforma sin firma no vale, tampoco en Linux", () => {
    const sinFirma = { ...conLinux, platforms: { ...conLinux.platforms, "linux-x86_64": { url: conLinux.platforms["linux-x86_64"].url } } };
    assert.match(problemasDeLatest(sinFirma, "0.1.4").join(), /linux-x86_64: falta la firma/);
  });
});
