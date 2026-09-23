/**
 * Lee la imagen de un horario de clases (una captura, una foto o el PDF exportado como imagen) y saca las
 * clases: día, hora de inicio y fin, materia, clave y docente.
 *
 * No intenta «entender» cualquier imagen: busca la forma típica de un horario escolar — una tabla con los
 * días como columnas, las horas como filas y cada clase como un bloque de color — y lee cada bloque por
 * separado. Eso es mucho más fiable que leer toda la imagen de golpe, porque el texto sobre un fondo de color
 * (verde oscuro, azul…) se prepara bloque a bloque antes de reconocerlo.
 */
import { aBlancoYNegro, aHex, colorDeFondoEnFila, escalar, esBlanco, lineasHorizontales, lineasVerticales, prepararBloque, recortar, segmentarColores, type ImagenRgba, type Rgb } from "./imagen";

export interface PalabraOcr {
  texto: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confianza: number;
}

export interface LineaOcr extends PalabraOcr {}

export interface ResultadoOcr {
  texto: string;
  confianza: number;
  lineas: LineaOcr[];
  palabras: PalabraOcr[];
}

/**
 * «bloque»: un trozo de texto (el interior de una clase). «disperso»: texto suelto por toda la imagen.
 * «horas»: la columna de horas («07:00 - 08:00»), donde solo puede haber dígitos, «:» y «-».
 */
export type ModoOcr = "bloque" | "disperso" | "horas";
export type Reconocedor = (img: ImagenRgba, modo: ModoOcr) => Promise<ResultadoOcr>;

export interface ClaseEscaneada {
  materia: string;
  codigo: string;
  docente: string;
  dia: number;
  inicio: string;
  fin: string;
  color: string;
  /** El reconocimiento no quedó seguro: conviene revisarla antes de guardar. */
  dudosa: boolean;
}

export class ErrorEscaneo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorEscaneo";
  }
}

const NOMBRES_DIA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "a", "o", "u", "para", "por", "con", "al"]);

/** Sin acentos, en mayúsculas y solo letras y números: para comparar textos leídos con errores. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(previa[j]! + 1, actual[j - 1]! + 1, previa[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = actual;
  }
  return previa[b.length]!;
}

/** 1 = idénticos, 0 = nada en común. */
export function similitud(a: string, b: string): number {
  const largo = Math.max(a.length, b.length);
  return largo === 0 ? 1 : 1 - distanciaEdicion(a, b) / largo;
}

const mediana = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** «REDES DE COMPUTADORA» → «Redes de computadora»; las siglas romanas (I, II, III…) se respetan. */
export function tituloBonito(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => {
      if (/^(i{1,3}|iv|v|vi{1,3}|ix|x)$/.test(p)) return p.toUpperCase();
      if (i > 0 && MINUSCULAS.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

/** Deja solo lo que puede ser parte de un nombre de materia o docente. */
function limpiar(texto: string): string {
  return texto
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\p{L}\p{N}()\-–—:./ ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PATRON_CODIGO = /\(?\s*([A-Z]{2,5})\s*[-–—]\s*([0-9OIl]{3,5})\s*\)?/;

/** Un código bien formado: 3 o 4 letras, guion y 4 dígitos («SDC-1021»). */
const CODIGO_BUENO = /^[A-Z]{3,4}-\d{4}$/;

/** Corrige los fallos típicos de lectura de una clave: letra sobrante delante o dígito sobrante detrás. */
function arreglarCodigo(letras: string, digitos: string): string {
  let l = letras;
  let d = digitos.replace(/[Oo]/g, "0").replace(/[Il]/g, "1");
  if (l.length === 5 && /^[IL]/.test(l)) l = l.slice(1); // el «(» de delante se leyó como una letra
  if (d.length === 5) d = d.slice(0, 4); // el «)» de detrás se leyó como un dígito
  return `${l}-${d}`;
}

/** «Lenguajes y Autómatas 1» → «… I»: el número romano suele leerse como 1, l, 5 o |. */
function arreglarRomano(nombre: string): string {
  return nombre.replace(/\s+[1l5|!]$/, " I");
}

/** Separa la clave de la materia («(SDC-1021)») del nombre. */
export function separarCodigo(texto: string): { nombre: string; codigo: string } {
  const limpio = limpiar(texto);
  const m = PATRON_CODIGO.exec(limpio.toUpperCase());
  if (!m) return { nombre: arreglarRomano(limpio.replace(/[()]/g, "").trim()), codigo: "" };
  const nombre = (limpio.slice(0, m.index) + " " + limpio.slice(m.index + m[0].length)).replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  return { nombre: arreglarRomano(nombre), codigo: arreglarCodigo(m[1]!, m[2]!) };
}

/**
 * Las claves largas se parten en dos líneas («(SCD-» y «1003)»): se vuelven a unir. También se une una línea que
 * es solo la clave («(SCC-1007)») con la anterior.
 */
function unirLineasPartidas(lineas: string[]): string[] {
  const soloClave = /^\(?\s*[A-Z0-9]{0,5}\s*-?\s*\d{3,5}\s*\)?$/;
  const salida: string[] = [];
  for (const l of lineas) {
    const previa = salida[salida.length - 1];
    if (previa !== undefined && (/-\s*$/.test(previa) || soloClave.test(l.toUpperCase()))) salida[salida.length - 1] = `${previa} ${l}`;
    else salida.push(l);
  }
  return salida;
}

interface Bloque {
  dia: number;
  y0: number;
  y1: number;
  color: Rgb;
  materia: string;
  codigo: string;
  confianza: number;
}

/** Recta y = a + b·x por mínimos cuadrados. */
function regresion(puntos: { x: number; y: number }[]): { a: number; b: number } | null {
  const n = puntos.length;
  if (n < 2) return null;
  const mx = puntos.reduce((s, p) => s + p.x, 0) / n;
  const my = puntos.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of puntos) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}

const PATRON_HORAS = /(\d{1,2})\s*[:.]?\s*(\d{2})\s*[-–—~]+\s*(\d{1,2})\s*[:.]?\s*(\d{2})/;

interface Columna {
  izq: number;
  der: number;
}

export async function escanearHorario(
  img: ImagenRgba,
  reconocer: Reconocedor,
  alProgreso?: (fraccion: number, texto: string) => void,
): Promise<ClaseEscaneada[]> {
  const avisar = (f: number, t: string) => alProgreso?.(f, t);

  // 1) Los días (columnas): se buscan sus nombres en la fila de arriba.
  avisar(0.05, "Buscando los días y las horas…");
  const kAncla = limitar(1800 / img.width, 1, 4);
  const paraAnclas = aBlancoYNegro(escalar(img, kAncla), (l) => l < 110, 0);
  const anclas = await reconocer(paraAnclas, "disperso");

  const dias: { i: number; xc: number; y0: number; y1: number; sim: number }[] = [];
  for (const p of anclas.palabras) {
    const n = normalizar(p.texto);
    if (n.length < 3) continue;
    let mejor = -1;
    let simMejor = 0;
    NOMBRES_DIA.forEach((d, i) => {
      const s = similitud(n, d);
      if (s > simMejor) {
        simMejor = s;
        mejor = i;
      }
    });
    if (mejor >= 0 && simMejor >= 0.6) {
      const previo = dias.find((d) => d.i === mejor);
      const nuevo = { i: mejor, xc: (p.x0 + p.x1) / 2 / kAncla, y0: p.y0 / kAncla, y1: p.y1 / kAncla, sim: simMejor };
      if (!previo) dias.push(nuevo);
      else if (simMejor > previo.sim) Object.assign(previo, nuevo);
    }
  }
  if (dias.length < 3) throw new ErrorEscaneo("No encontré los días de la semana (Lunes, Martes…) en la imagen. Prueba con una imagen más grande o recortada solo a la tabla.");

  const pasos: number[] = [];
  for (const a of dias) for (const b of dias) if (a.i > b.i) pasos.push((a.xc - b.xc) / (a.i - b.i));
  const paso = mediana(pasos);
  if (!(paso > 20)) throw new ErrorEscaneo("Las columnas de los días no tienen sentido en esta imagen. Prueba con una captura más nítida de la tabla.");
  const x0 = mediana(dias.map((d) => d.xc - d.i * paso));
  const ultimoDia = Math.max(4, ...dias.map((d) => d.i));
  const yCabecera = mediana(dias.map((d) => d.y1));

  // Las columnas de una tabla de Excel no suelen medir lo mismo: se buscan las líneas verticales de la
  // cuadrícula en la fila de los días y cada día ocupa el hueco entre dos líneas. Si no se ven, se
  // reparten a partes iguales.
  const lineasV = lineasVerticales(img, mediana(dias.map((d) => d.y0)) - 6, yCabecera + 6);
  const huecos: Columna[] = [];
  for (let k = 0; k + 1 < lineasV.length; k++) {
    const ancho = lineasV[k + 1]! - lineasV[k]!;
    if (ancho >= paso * 0.4 && ancho <= paso * 2.5) huecos.push({ izq: lineasV[k]!, der: lineasV[k + 1]! });
  }
  const indiceDeHueco = (xc: number) => huecos.findIndex((h) => xc > h.izq && xc < h.der);
  const desfases = dias.map((d) => indiceDeHueco(d.xc) - d.i).filter((_, k) => indiceDeHueco(dias[k]!.xc) >= 0);
  const desfase = desfases.length >= 2 ? mediana(desfases) : NaN;
  const columnas: (Columna | null)[] = [];
  for (let d = 0; d <= ultimoDia; d++) {
    const hueco = Number.isFinite(desfase) ? huecos[d + desfase] : undefined;
    columnas.push(hueco ?? { izq: x0 + d * paso - paso / 2, der: x0 + d * paso + paso / 2 });
  }
  const primera = columnas[0]!;
  const ultima = columnas[ultimoDia]!;

  // 2) Las filas (horas): las líneas horizontales de la columna de horas marcan cada fila (en Excel tampoco
  // miden todas igual) y cada etiqueta «07:00 - 08:00» se lee sola, en su celda.
  const yTop = Math.max(0, Math.round(yCabecera + 1));
  const lineasH = primera.izq > 12 ? lineasHorizontales(img, 3, primera.izq - 3, yTop - 4, img.height).filter((y) => y > yCabecera - 4) : [];
  const alturaFila = mediana(lineasH.slice(1).map((y, k) => y - lineasH[k]!));
  const filas: number[] = [];
  for (const y of lineasH) if (filas.length === 0 || y - filas[filas.length - 1]! > alturaFila * 0.4) filas.push(y);

  const parsearHoras = (texto: string): { ini: number; fin: number } | null => {
    const t = texto.replace(/[OoQ]/g, "0").replace(/[lI|]/g, "1");
    let h1: number, m1: number, h2: number, m2: number;
    const m = PATRON_HORAS.exec(t);
    if (m) [h1, m1, h2, m2] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    else {
      const d = t.replace(/\D/g, "");
      const c = d.length === 7 ? "0" + d : d;
      if (c.length !== 8) return null;
      [h1, m1, h2, m2] = [Number(c.slice(0, 2)), Number(c.slice(2, 4)), Number(c.slice(4, 6)), Number(c.slice(6, 8))];
    }
    const ini = h1 * 60 + m1;
    const fin = h2 * 60 + m2;
    return h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59 || fin <= ini ? null : { ini, fin };
  };

  const etiquetas: { fila: number; yc: number; ini: number; fin: number }[] = [];
  const kHoras = limitar(500 / Math.max(1, primera.izq), 1, 8);
  if (filas.length >= 3) {
    for (let r = 0; r + 1 < filas.length; r++) {
      const celda = recortar(img, 3, filas[r]! + 2, primera.izq - 3, filas[r + 1]! - 2);
      const leida = await reconocer(prepararBloque(escalar(celda, kHoras), [255, 255, 255]), "horas");
      const h = parsearHoras(leida.texto);
      if (h) etiquetas.push({ fila: r, yc: (filas[r]! + filas[r + 1]!) / 2, ...h });
    }
  } else if (primera.izq > 12) {
    // Sin líneas claras: se lee toda la franja de una vez.
    const franja = recortar(img, 0, yTop, primera.izq, img.height);
    const kF = limitar(700 / franja.width, 1, 6);
    const leidas = await reconocer(prepararBloque(escalar(franja, kF), [255, 255, 255]), "horas");
    for (const l of leidas.lineas) {
      const h = parsearHoras(l.texto);
      if (h) etiquetas.push({ fila: -1, yc: yTop + ((l.y0 + l.y1) / 2 - 10) / kF, ...h });
    }
  }
  if (etiquetas.length < 2) throw new ErrorEscaneo("No pude leer las horas de la izquierda (por ejemplo «07:00 - 08:00»). Prueba con una imagen más nítida.");
  // Una etiqueta mal leída (por ejemplo «12:00 - 13:09») no debe torcer todo: solo cuentan las de duración normal.
  const duracion = mediana(etiquetas.map((e) => e.fin - e.ini));
  const buenas = etiquetas.filter((e) => Math.abs(e.fin - e.ini - duracion) <= 5);

  let minutoEnBorde: ((y: number) => number) | null = null;
  if (filas.length >= 3 && buenas.every((e) => e.fila >= 0) && buenas.length >= 2) {
    // Cada etiqueta dice a qué hora empieza su fila: la hora de la primera se saca por votación.
    const t0 = mediana(buenas.map((e) => e.ini - e.fila * duracion));
    minutoEnBorde = (y: number) => {
      let mejor = 0;
      for (let k = 1; k < filas.length; k++) if (Math.abs(filas[k]! - y) < Math.abs(filas[mejor]! - y)) mejor = k;
      return t0 + mejor * duracion;
    };
  }
  if (!minutoEnBorde) {
    // Sin líneas claras: recta a través de las etiquetas.
    const recta = regresion(buenas.map((e) => ({ x: (e.ini + e.fin) / 2, y: e.yc })));
    if (!recta || recta.b <= 0) throw new ErrorEscaneo("Las horas de la izquierda no están en orden. Prueba con otra imagen.");
    minutoEnBorde = (y: number) => Math.round((y - recta.a) / recta.b / 15) * 15;
  }
  const alto = filas.length >= 3 ? alturaFila : 60;

  // Las líneas de la cuadrícula se ven más gruesas en una imagen grande: lo que se tolera crece con el alto de fila.
  const grosor = Math.max(3, Math.round(alto * 0.06));

  // 3) Los bloques de color de cada columna.
  avisar(0.2, "Buscando las clases…");
  const yIni = Math.max(0, Math.round(yCabecera + 2));
  const bloques: Bloque[] = [];
  for (let d = 0; d <= ultimoDia; d++) {
    const col = columnas[d]!;
    if (col.izq + (col.der - col.izq) * 0.5 > img.width) continue;
    const ancho = col.der - col.izq;
    const colores: Rgb[] = [];
    for (let y = yIni; y < img.height; y++) colores.push(colorDeFondoEnFila(img, col.izq + ancho * 0.08, col.izq + ancho * 0.92, y));
    for (const t of segmentarColores(colores, alto * 0.45, grosor)) {
      if (esBlanco(t.color)) continue;
      bloques.push({ dia: d, y0: yIni + t.desde, y1: yIni + t.hasta, color: t.color, materia: "", codigo: "", confianza: 0 });
    }
  }
  if (bloques.length === 0) throw new ErrorEscaneo("No encontré clases (bloques de color) en la tabla. ¿Es la imagen de un horario con las clases coloreadas?");

  // 4) Leer cada bloque por separado.
  const kBloque = limitar(300 / paso, 1, 4);
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i]!;
    avisar(0.25 + 0.55 * (i / bloques.length), `Leyendo clase ${i + 1} de ${bloques.length}…`);
    const col = columnas[b.dia]!;
    const recorte = recortar(img, col.izq + 3, b.y0 + 3, col.der - 3, b.y1 - 3);
    const leido = await reconocer(prepararBloque(escalar(recorte, kBloque), b.color), "bloque");
    const { nombre, codigo } = separarCodigo(leido.texto);
    b.materia = nombre;
    b.codigo = codigo;
    b.confianza = leido.confianza;
  }

  // Una misma materia aparece varios días: se toma la lectura más segura como la buena para todas.
  const grupos: Bloque[][] = [];
  for (const b of bloques) {
    const g = grupos.find((gr) => gr.some((o) => (o.codigo && o.codigo === b.codigo) || (normalizar(o.materia).length >= 4 && similitud(normalizar(o.materia), normalizar(b.materia)) >= 0.72)));
    if (g) g.push(b);
    else grupos.push([b]);
  }
  const elegirCodigo = (g: Bloque[], extra: string[] = []) => {
    const votos = new Map<string, number>();
    const voto = (c: string, peso: number) => c && votos.set(c, (votos.get(c) ?? 0) + peso + (CODIGO_BUENO.test(c) ? 0.5 : 0));
    for (const b of g) voto(b.codigo, 1);
    for (const c of extra) voto(c, 3.5); // la lista de la derecha se lee más limpia que el interior de un bloque
    return [...votos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };
  for (const g of grupos) {
    const mejor = [...g].sort((x, y) => y.confianza - x.confianza)[0]!;
    const codigo = elegirCodigo(g);
    for (const b of g) {
      b.materia = mejor.materia;
      b.codigo = codigo;
    }
  }

  // 5) Docentes: la columna de la derecha («DOCENTE / MATERIA»).
  const docentes = new Map<string, string>();
  const codigosLeyenda = new Map<Bloque[], string>();
  const izqLeyenda = ultima.der + 1;
  if (img.width - izqLeyenda > paso) {
    avisar(0.85, "Buscando a los docentes…");
    const colores: Rgb[] = [];
    for (let y = yIni; y < img.height; y++) colores.push(colorDeFondoEnFila(img, izqLeyenda + 6, img.width - 6, y));
    const nombresClase = grupos.map((g) => normalizar(g[0]!.materia)).filter((n) => n.length >= 3);
    const esParteDeMateria = (linea: string) => {
      const n = normalizar(linea);
      if (n.length < 3) return false;
      return nombresClase.some((c) => c.includes(n) || n.includes(c) || similitud(n, c) >= 0.75);
    };
    // Un docente puede dar varias materias seguidas y aparece una sola vez debajo de la última: las materias
    // que aún no tienen docente se quedan «pendientes» hasta que aparece uno.
    let pendientes: Bloque[][] = [];
    for (const t of segmentarColores(colores, alto * 0.22, grosor)) {
      if (esBlanco(t.color)) continue;
      const recorte = recortar(img, izqLeyenda + 3, yIni + t.desde + 2, img.width - 3, yIni + t.hasta - 2);
      const leido = await reconocer(prepararBloque(escalar(recorte, kBloque), t.color), "bloque");
      const lineas = unirLineasPartidas(leido.texto.split(/\r?\n/).map(limpiar).filter((l) => l.length >= 3));
      const tieneCodigo = (l: string) => PATRON_CODIGO.test(l.toUpperCase());
      const esDocente = (l: string) => !/\d/.test(l) && !tieneCodigo(l) && !esParteDeMateria(l);
      // Cada materia termina en su clave; una sin clave («Tutoría») termina donde empieza el docente.
      let buffer: string[] = [];
      const cerrarMateria = () => {
        if (buffer.length === 0) return;
        const { nombre, codigo } = separarCodigo(buffer.join(" "));
        buffer = [];
        const n = normalizar(nombre);
        const grupo = grupos.find((g) => (codigo && g[0]!.codigo === codigo) || (n.length >= 3 && similitud(normalizar(g[0]!.materia), n) >= 0.7));
        if (!grupo) return;
        if (codigo) codigosLeyenda.set(grupo, codigo);
        if (!pendientes.includes(grupo)) pendientes.push(grupo);
      };
      for (const l of lineas) {
        if (esDocente(l)) {
          cerrarMateria();
          const nombreDocente = tituloBonito(l);
          for (const g of pendientes) docentes.set(normalizar(g[0]!.materia) + "|" + grupos.indexOf(g), nombreDocente);
          pendientes = [];
        } else {
          buffer.push(l);
          if (tieneCodigo(l)) cerrarMateria();
        }
      }
      cerrarMateria();
    }
  }
  // El código de la leyenda (letra grande, aparte de las clases) cuenta como un voto más.
  for (const g of grupos) {
    const extra = codigosLeyenda.get(g);
    if (extra) {
      const codigo = elegirCodigo(g, [extra]);
      for (const b of g) b.codigo = codigo;
    }
  }

  // 6) Resultado.
  avisar(1, "Listo");
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const clases: ClaseEscaneada[] = [];
  for (const b of bloques) {
    const ini = minutoEnBorde(b.y0);
    const fin = minutoEnBorde(b.y1);
    if (fin - ini < 30 || ini < 0 || fin > 24 * 60) continue;
    const nombre = b.materia ? tituloBonito(b.materia) : "";
    clases.push({
      materia: nombre || "Clase sin nombre",
      codigo: b.codigo,
      docente: docentes.get(normalizar(b.materia) + "|" + grupos.findIndex((g) => g.includes(b))) ?? "",
      dia: b.dia,
      inicio: hh(ini),
      fin: hh(fin),
      color: aHex(b.color),
      dudosa: normalizar(b.materia).length < 4 || b.confianza < 55,
    });
  }
  if (clases.length === 0) throw new ErrorEscaneo("Encontré la tabla pero ninguna clase con un tamaño razonable.");
  return clases.sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio));
}
