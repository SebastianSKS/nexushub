import { createHash, createPublicKey, verify } from "node:crypto";

/**
 * Comprobaciones de una versión de Nexo ANTES de publicarla (y de lo ya publicado): que los números de versión coincidan,
 * que la firma del instalador sea de verdad de nuestra llave y que el `latest.json` diga lo que tiene que decir. Un
 * error aquí es lo que, si se publicara, dejaría a quien ya tiene Nexo sin poder actualizar. Lo usan los scripts de
 * `scripts/` y las pruebas; la aplicación no lo importa.
 */

// ─── Firma minisign (la que usa el actualizador de Tauri) ──────────────────────────────────────────────────────────

const decodificar = (b64: string) => Buffer.from(b64.trim(), "base64");
const CABECERA_ED25519_SPKI = Buffer.from("302a300506032b6570032100", "hex");

const llavePublica = (cruda: Buffer) => createPublicKey({ key: Buffer.concat([CABECERA_ED25519_SPKI, cruda]), format: "der", type: "spki" });

interface LlavePublicaMinisign {
  idLlave: string;
  cruda: Buffer;
}

/** La llave pública tal como va en `tauri.conf.json`: el archivo `.pub` de minisign, en base64. */
export function leerLlavePublica(pubkeyBase64: string): LlavePublicaMinisign {
  const lineas = decodificar(pubkeyBase64).toString("utf8").split(/\r?\n/).filter(Boolean);
  const bytes = decodificar(lineas[1] ?? "");
  if (bytes.length !== 42 || bytes.subarray(0, 2).toString("latin1") !== "Ed") throw new Error("La llave pública no tiene el formato de minisign.");
  return { idLlave: bytes.subarray(2, 10).toString("hex"), cruda: bytes.subarray(10) };
}

export interface ResultadoFirma {
  ok: boolean;
  motivo?: string;
  /** El comentario de confianza (versión y archivo firmados), si la firma es válida. */
  comentario?: string;
}

/**
 * Comprueba que `contenido` (los bytes del instalador) está firmado por la llave pública. `firma` es el texto del `.sig`
 * (o el campo `signature` de latest.json): el archivo de firma de minisign, en base64.
 */
export function verificarFirma(contenido: Uint8Array, firma: string, pubkeyBase64: string): ResultadoFirma {
  let llave: LlavePublicaMinisign;
  let lineas: string[];
  try {
    llave = leerLlavePublica(pubkeyBase64);
    lineas = decodificar(firma).toString("utf8").split(/\r?\n/);
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "Firma ilegible." };
  }
  const bytesFirma = decodificar(lineas[1] ?? "");
  const comentario = (lineas[2] ?? "").replace(/^trusted comment: /, "");
  const global = decodificar(lineas[3] ?? "");
  if (bytesFirma.length !== 74) return { ok: false, motivo: "La firma no tiene el tamaño esperado." };
  const algoritmo = bytesFirma.subarray(0, 2).toString("latin1");
  if (bytesFirma.subarray(2, 10).toString("hex") !== llave.idLlave) return { ok: false, motivo: "La firma es de otra llave (no es la de tauri.conf.json)." };
  const clave = llavePublica(llave.cruda);
  const firmaCruda = bytesFirma.subarray(10);
  // «ED»: minisign firma el resumen BLAKE2b-512 del archivo; «Ed»: el archivo tal cual.
  const mensaje = algoritmo === "ED" ? createHash("blake2b512").update(contenido).digest() : Buffer.from(contenido);
  if (algoritmo !== "ED" && algoritmo !== "Ed") return { ok: false, motivo: `Algoritmo de firma desconocido («${algoritmo}»).` };
  if (!verify(null, mensaje, clave, firmaCruda)) return { ok: false, motivo: "La firma NO corresponde a este archivo: el instalador cambió después de firmarse, o se firmó otro." };
  if (!verify(null, Buffer.concat([firmaCruda, Buffer.from(comentario, "utf8")]), clave, global)) return { ok: false, motivo: "El comentario de la firma (versión y nombre) está alterado." };
  return { ok: true, comentario };
}

// ─── Versiones y latest.json ───────────────────────────────────────────────────────────────────────────────────────

export interface VersionesDeArchivos {
  packageJson: string;
  tauriConf: string;
  cargoToml: string;
  packageLock: string;
  cargoLock: string;
}

/** Los archivos donde vive el número de versión que no coinciden con el de tauri.conf.json (lista vacía = todo bien). */
export function versionesQueNoCoinciden(v: VersionesDeArchivos): string[] {
  return (Object.entries(v) as [keyof VersionesDeArchivos, string][]).filter(([, valor]) => valor !== v.tauriConf).map(([k, valor]) => `${k}: ${valor || "(no encontrada)"} (debería ser ${v.tauriConf})`);
}

/** La versión de `version = "x.y.z"` en el bloque [package] de un Cargo.toml. */
export function versionDeCargoToml(texto: string): string {
  return /^\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m.exec(texto)?.[1] ?? "";
}

/** La versión del paquete `nombre` en un Cargo.lock. */
export function versionDeCargoLock(texto: string, nombre: string): string {
  return new RegExp(`\\[\\[package\\]\\]\\s*name = "${nombre}"\\s*version = "([^"]+)"`).exec(texto)?.[1] ?? "";
}

export interface LatestJson {
  version?: unknown;
  notes?: unknown;
  pub_date?: unknown;
  platforms?: Record<string, { signature?: unknown; url?: unknown }>;
}

/** Lo que está mal en un latest.json para la versión esperada (lista vacía = todo bien).
 *
 * Windows tiene que estar siempre. Las demás plataformas que el release traiga también se comprueban —que la url
 * sea https y apunte a `/v<version>/`, y que la firma exista—, porque un `linux-x86_64` mal puesto dejaría a
 * quien usa Linux sin poder actualizar, que es justo lo que este archivo existe para que no pase.
 *
 * `firmas` son las firmas de los archivos `.sig` de esta compilación (clave de plataforma → contenido). Si se pasan,
 * además se comprueba que la firma de latest.json sea la de verdad y no la de otro archivo.
 */
export function problemasDeLatest(latest: LatestJson, version: string, firmas?: Record<string, string>): string[] {
  const problemas: string[] = [];
  if (latest.version !== version) problemas.push(`version dice «${String(latest.version)}» y debería decir «${version}».`);
  if (typeof latest.pub_date !== "string" || Number.isNaN(Date.parse(latest.pub_date))) problemas.push("pub_date no es una fecha válida.");
  const plataformas = latest.platforms ?? {};
  if (!plataformas["windows-x86_64"]) problemas.push("falta platforms.windows-x86_64.");
  for (const [clave, p] of Object.entries(plataformas)) {
    if (typeof p?.url !== "string" || !p.url.startsWith("https://")) {
      problemas.push(`${clave}: la url del instalador no es https.`);
    } else if (!new RegExp(`/v${version.replaceAll(".", "\\.")}/[^/]+$`).test(p.url)) {
      problemas.push(`${clave}: la url no apunta a un archivo de /v${version}/: ${p.url}`);
    }
    if (typeof p?.signature !== "string" || p.signature.length < 100) problemas.push(`${clave}: falta la firma o es demasiado corta.`);
    const esperada = firmas?.[clave];
    if (esperada !== undefined && p?.signature !== esperada.trim()) problemas.push(`${clave}: la firma de latest.json no es la del archivo .sig.`);
  }
  return problemas;
}
