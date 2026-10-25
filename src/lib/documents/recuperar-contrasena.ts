/**
 * Generación de contraseñas candidatas para «Recuperar contraseña» (lógica pura, sin DOM ni React).
 *
 * Alcance y honestidad: esta herramienta solo sirve para recuperar la contraseña OLVIDADA de un PDF
 * propio. No «rompe» el cifrado: prueba contraseñas candidatas una por una hasta dar con la correcta.
 * Por eso encuentra contraseñas DÉBILES (números, fechas, palabras comunes, combinaciones cortas) pero
 * NO una contraseña larga y al azar, que con este método sigue siendo irrecuperable en la práctica.
 *
 * El motor que prueba cada candidato contra el PDF vive en services/documents/motor/pdf-recuperado.ts;
 * aquí solo se generan y cuentan los candidatos, para poder probarlo sin navegador.
 */

export type MetodoRecuperacion = "auto" | "comunes" | "numeros" | "fuerza-bruta";
export type JuegoCaracteres = "numeros" | "letras" | "letras-numeros";

export interface OpcionesRecuperacion {
  metodo: MetodoRecuperacion;
  /** «numeros» y «fuerza-bruta»: longitud máxima a probar (base 1). */
  maxLongitud: number;
  /** «fuerza-bruta»: qué caracteres combinar. */
  juego: JuegoCaracteres;
}

export const MAX_LONGITUD_NUMEROS = 8;
export const MAX_LONGITUD_FUERZA = 6;
/** Modo «auto»: primero comunes, luego números hasta este largo, luego letras+números hasta este otro. */
const AUTO_NUMEROS = 6;
const AUTO_FUERZA = 4;
/** Tope duro de intentos: por encima de esto, mejor no intentarlo (tardaría demasiado). */
export const MAX_INTENTOS = 60_000_000;

const DIGITOS = "0123456789";
const LETRAS = "abcdefghijklmnopqrstuvwxyz";

export function juegoDe(juego: JuegoCaracteres): string {
  if (juego === "numeros") return DIGITOS;
  if (juego === "letras") return LETRAS;
  return LETRAS + DIGITOS;
}

function acotar(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Deja las opciones dentro de los límites válidos (longitud según el método). */
export function acotarOpciones(o: OpcionesRecuperacion): OpcionesRecuperacion {
  const tope = o.metodo === "fuerza-bruta" ? MAX_LONGITUD_FUERZA : MAX_LONGITUD_NUMEROS;
  return { metodo: o.metodo, juego: o.juego, maxLongitud: acotar(o.maxLongitud, 1, tope) };
}

/**
 * Las contraseñas más usadas del mundo, unas cuantas típicas en español y patrones de teclado
 * frecuentes. Son DATOS (cadenas a probar), no texto de interfaz: por eso no se traducen.
 */
export const CONTRASENAS_COMUNES: readonly string[] = [
  "123456", "password", "123456789", "12345678", "12345", "qwerty", "1234567", "111111", "1234567890",
  "123123", "000000", "iloveyou", "1234", "1q2w3e4r", "qwertyuiop", "123", "monkey", "dragon", "123321",
  "654321", "666666", "1qaz2wsx", "myspace1", "121212", "homelesspa", "123qwe", "a123456", "123abc",
  "1q2w3e", "qwe123", "7777777", "qwerty123", "superman", "abc123", "football", "princess", "admin",
  "welcome", "login", "passw0rd", "master", "hello", "whatever", "zaq12wsx", "password1", "password123",
  "qazwsx", "asdfgh", "asdfghjkl", "zxcvbnm", "1234qwer", "aaaaaa", "112233", "131313", "987654321",
  "shadow", "sunshine", "michael", "computer", "letmein", "baseball", "soccer", "batman", "trustno1",
  "ninja", "starwars", "cheese", "jordan", "harley", "ranger", "pepper", "jennifer", "hunter", "buster",
  "thomas", "robert", "andrew", "charlie", "daniel", "matthew", "access", "flower", "hottie", "loveme",
  "secret", "summer", "internet", "service", "canada", "freedom", "winter", "google", "mustang",
  "contraseña", "contrasena", "hola", "holahola", "amor", "teamo", "familia", "mexico", "espana",
  "madrid", "barcelona", "america", "chivas", "futbol", "beisbol", "estrella", "mariposa", "gatito",
  "perrito", "tequiero", "miamor", "princesa", "corazon", "angel", "carlos", "maria", "jose", "juan",
  "lupita", "fernanda", "sebastian", "alejandro", "guadalupe", "estudiante", "escuela", "colegio",
  "11111111", "00000000", "12341234", "qwertyui", "asd123", "zxc123", "poiuyt", "lkjhgf", "mnbvcx",
  "1111", "0000", "2580", "1212", "7410", "1111111", "123456a", "a1b2c3", "abcd1234", "test", "test123",
  "temporal", "cambiame", "nueva", "default", "usuario", "root", "toor", "pass", "1234abcd", "abcdefg",
];

function* numeros(maxLongitud: number): Generator<string> {
  const max = Math.min(Math.max(maxLongitud, 1), MAX_LONGITUD_NUMEROS);
  for (let largo = 1; largo <= max; largo++) {
    const hasta = 10 ** largo;
    for (let i = 0; i < hasta; i++) yield String(i).padStart(largo, "0");
  }
}

function* fuerzaBruta(juego: string, maxLongitud: number): Generator<string> {
  const max = Math.min(Math.max(maxLongitud, 1), MAX_LONGITUD_FUERZA);
  const base = juego.length;
  for (let largo = 1; largo <= max; largo++) {
    const indices = new Array<number>(largo).fill(0);
    for (;;) {
      let palabra = "";
      for (let k = 0; k < largo; k++) palabra += juego[indices[k]!];
      yield palabra;
      // Suma 1 como si fuera un contador en base `base`, de derecha a izquierda.
      let pos = largo - 1;
      while (pos >= 0) {
        indices[pos]!++;
        if (indices[pos]! < base) break;
        indices[pos] = 0;
        pos--;
      }
      if (pos < 0) break; // se recorrieron todas las combinaciones de esta longitud
    }
  }
}

/** Candidatos a contraseña, en orden, según el método elegido. Es perezoso: no crea listas enormes en memoria. */
export function* candidatos(opciones: OpcionesRecuperacion): Generator<string> {
  const o = acotarOpciones(opciones);
  if (o.metodo === "auto") {
    // Lo más probable primero: contraseñas comunes, luego PIN/fechas, luego combinaciones cortas.
    yield* CONTRASENAS_COMUNES;
    yield* numeros(AUTO_NUMEROS);
    yield* fuerzaBruta(juegoDe("letras-numeros"), AUTO_FUERZA);
    return;
  }
  if (o.metodo === "comunes") {
    yield* CONTRASENAS_COMUNES;
    return;
  }
  if (o.metodo === "numeros") {
    yield* numeros(o.maxLongitud);
    return;
  }
  yield* fuerzaBruta(juegoDe(o.juego), o.maxLongitud);
}

function sumaPotencias(base: number, maxLargo: number): number {
  let total = 0;
  for (let largo = 1; largo <= maxLargo; largo++) total += base ** largo;
  return total;
}

/** Cuántos candidatos probará, para estimar el tiempo y avisar si son demasiados. */
export function contarCandidatos(opciones: OpcionesRecuperacion): number {
  const o = acotarOpciones(opciones);
  if (o.metodo === "auto") return CONTRASENAS_COMUNES.length + sumaPotencias(10, AUTO_NUMEROS) + sumaPotencias(36, AUTO_FUERZA);
  if (o.metodo === "comunes") return CONTRASENAS_COMUNES.length;
  const base = o.metodo === "numeros" ? 10 : juegoDe(o.juego).length;
  return sumaPotencias(base, o.maxLongitud);
}
