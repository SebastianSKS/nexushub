/**
 * Calculadora: evalúa lo que se escribe («2+3×sin(30)», «√(16)+5!», «15%»…) con un analizador propio.
 * No usa `eval` ni `Function`: solo entiende números, operadores, paréntesis, constantes y las funciones de
 * la lista, así que no puede ejecutar nada más.
 */

export class ErrorCalculo extends Error {}

export interface OpcionesCalculo {
  /** true = los ángulos de sin, cos, tan… van en grados; false = en radianes. */
  grados: boolean;
  /** Resultado anterior, para «Ans». */
  ans: number;
}

type Token = { t: "num"; v: number } | { t: "op"; v: string } | { t: "id"; v: string };

const FUNCIONES = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt", "cbrt", "abs", "exp", "fact"]);
const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenizar(texto: string): Token[] {
  const s = texto
    .replace(/×|·/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/π/g, " pi ")
    .replace(/√/g, " sqrt ")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/,/g, ".")
    .toLowerCase();
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === " ") {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j]!)) j++;
      // Notación científica: 1.5e3, 2E-4 (solo si tras la «e» hay dígitos; si no, es la constante e).
      const exp = /^e[+-]?\d+/.exec(s.slice(j));
      if (exp) j += exp[0].length;
      const n = Number(s.slice(i, j));
      if (!Number.isFinite(n) || /\..*\./.test(s.slice(i, j).replace(/e.*/, ""))) throw new ErrorCalculo("Número mal escrito");
      tokens.push({ t: "num", v: n });
      i = j;
    } else if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/.test(s[j]!)) j++;
      tokens.push({ t: "id", v: s.slice(i, j) });
      i = j;
    } else if ("+-*/^()!%".includes(c)) {
      tokens.push({ t: "op", v: c });
      i++;
    } else {
      throw new ErrorCalculo(`No entiendo «${c}»`);
    }
  }
  return tokens;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new ErrorCalculo("El factorial es solo de enteros desde 0");
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

/** Evalúa la expresión. Lanza `ErrorCalculo` con un mensaje corto si no se puede. */
export function evaluar(texto: string, { grados, ans }: OpcionesCalculo): number {
  const tokens = tokenizar(texto);
  if (tokens.length === 0) throw new ErrorCalculo("Escribe una operación");
  let pos = 0;

  const ver = () => tokens[pos];
  const esOp = (v: string) => {
    const t = ver();
    return t?.t === "op" && t.v === v;
  };
  const aRad = (x: number) => (grados ? (x * Math.PI) / 180 : x);
  const deRad = (x: number) => (grados ? (x * 180) / Math.PI : x);

  const funcion = (nombre: string, x: number): number => {
    switch (nombre) {
      case "sin": {
        const r = Math.sin(aRad(x));
        return Math.abs(r) < 1e-15 ? 0 : r;
      }
      case "cos": {
        const r = Math.cos(aRad(x));
        return Math.abs(r) < 1e-15 ? 0 : r;
      }
      case "tan": {
        if (grados && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-9) throw new ErrorCalculo("La tangente no existe ahí");
        const r = Math.tan(aRad(x));
        return Math.abs(r) < 1e-15 ? 0 : r;
      }
      case "asin":
        if (x < -1 || x > 1) throw new ErrorCalculo("El arcoseno va de −1 a 1");
        return deRad(Math.asin(x));
      case "acos":
        if (x < -1 || x > 1) throw new ErrorCalculo("El arcocoseno va de −1 a 1");
        return deRad(Math.acos(x));
      case "atan":
        return deRad(Math.atan(x));
      case "ln":
        if (x <= 0) throw new ErrorCalculo("El logaritmo pide un número mayor que 0");
        return Math.log(x);
      case "log":
        if (x <= 0) throw new ErrorCalculo("El logaritmo pide un número mayor que 0");
        return Math.log10(x);
      case "sqrt":
        if (x < 0) throw new ErrorCalculo("No hay raíz cuadrada real de un negativo");
        return Math.sqrt(x);
      case "cbrt":
        return Math.cbrt(x);
      case "abs":
        return Math.abs(x);
      case "exp":
        return Math.exp(x);
      case "fact":
        return factorial(x);
      default:
        throw new ErrorCalculo(`No conozco «${nombre}»`);
    }
  };

  // Hay algo que empieza un valor (para la multiplicación sin signo: «2π», «3(4+1)», «2sin(30)»).
  const empiezaValor = () => {
    const t = ver();
    return t !== undefined && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "("));
  };

  function primario(): number {
    const t = ver();
    if (!t) throw new ErrorCalculo("Falta un número");
    if (t.t === "num") {
      pos++;
      return t.v;
    }
    if (t.t === "op" && t.v === "(") {
      pos++;
      const v = suma();
      if (esOp(")")) pos++; // un paréntesis sin cerrar al final se perdona
      return v;
    }
    if (t.t === "id") {
      pos++;
      if (t.v === "ans") return ans;
      if (t.v in CONSTANTES) return CONSTANTES[t.v]!;
      const nombre = t.v === "fac" ? "fact" : t.v;
      if (FUNCIONES.has(nombre)) {
        // sin(30) o sin 30
        const arg = esOp("(") ? primario() : potencia();
        return funcion(nombre, arg);
      }
      throw new ErrorCalculo(`No conozco «${t.v}»`);
    }
    throw new ErrorCalculo("Falta un número");
  }

  function posfijo(): number {
    let v = primario();
    for (;;) {
      if (esOp("!")) {
        pos++;
        v = factorial(v);
      } else if (esOp("%")) {
        pos++;
        v = v / 100;
      } else return v;
    }
  }

  function potencia(): number {
    const base = posfijo();
    if (esOp("^")) {
      pos++;
      const exp = unario(); // asociativa a la derecha, y admite 2^-3
      return Math.pow(base, exp);
    }
    return base;
  }

  function unario(): number {
    if (esOp("-")) {
      pos++;
      return -unario();
    }
    if (esOp("+")) {
      pos++;
      return unario();
    }
    return potencia();
  }

  function producto(): number {
    let v = unario();
    for (;;) {
      if (esOp("*")) {
        pos++;
        v *= unario();
      } else if (esOp("/")) {
        pos++;
        const d = unario();
        if (d === 0) throw new ErrorCalculo("No se puede dividir entre 0");
        v /= d;
      } else if (empiezaValor()) {
        v *= unario();
      } else return v;
    }
  }

  function suma(): number {
    let v = producto();
    for (;;) {
      if (esOp("+")) {
        pos++;
        v += producto();
      } else if (esOp("-")) {
        pos++;
        v -= producto();
      } else return v;
    }
  }

  const r = suma();
  if (pos < tokens.length) throw new ErrorCalculo("Sobra algo al final");
  if (Number.isNaN(r)) throw new ErrorCalculo("Resultado no válido");
  if (!Number.isFinite(r)) throw new ErrorCalculo("El resultado es demasiado grande");
  return r;
}

/** Número listo para mostrar: sin el ruido de coma flotante (0.1+0.2 → 0.3) y con exponente si es enorme o diminuto. */
export function formatear(n: number): string {
  if (n === 0) return "0";
  const limpio = Number(n.toPrecision(15));
  const abs = Math.abs(limpio);
  if (abs >= 1e15 || abs < 1e-9) return limpio.toExponential(8).replace(/\.?0+e/, "e").replace("e+", "e");
  return String(limpio);
}
