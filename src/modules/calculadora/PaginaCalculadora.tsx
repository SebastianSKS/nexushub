"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { ErrorCalculo, evaluar, formatear } from "@/lib/calculadora/evaluar";

type Modo = "normal" | "cientifica";

interface Tecla {
  /** Lo que se ve en el botón. */
  etiqueta: string;
  /** Lo que se escribe (si no es una acción especial). */
  texto?: string;
  accion?: "borrar" | "atras" | "igual" | "ans";
  /** Nombre para lectores de pantalla. */
  nombre?: string;
  tipo?: "numero" | "operador" | "funcion" | "acento";
}

const NUMERICAS: Tecla[][] = [
  [{ etiqueta: "C", accion: "borrar", nombre: "Borrar todo", tipo: "operador" }, { etiqueta: "⌫", accion: "atras", nombre: "Borrar el último", tipo: "operador" }, { etiqueta: "%", texto: "%", nombre: "Por ciento", tipo: "operador" }, { etiqueta: "÷", texto: "÷", nombre: "Dividir", tipo: "operador" }],
  [{ etiqueta: "7", texto: "7" }, { etiqueta: "8", texto: "8" }, { etiqueta: "9", texto: "9" }, { etiqueta: "×", texto: "×", nombre: "Multiplicar", tipo: "operador" }],
  [{ etiqueta: "4", texto: "4" }, { etiqueta: "5", texto: "5" }, { etiqueta: "6", texto: "6" }, { etiqueta: "−", texto: "−", nombre: "Restar", tipo: "operador" }],
  [{ etiqueta: "1", texto: "1" }, { etiqueta: "2", texto: "2" }, { etiqueta: "3", texto: "3" }, { etiqueta: "+", texto: "+", nombre: "Sumar", tipo: "operador" }],
  [{ etiqueta: "Ans", accion: "ans", nombre: "Resultado anterior", tipo: "operador" }, { etiqueta: "0", texto: "0" }, { etiqueta: ".", texto: ".", nombre: "Punto decimal" }, { etiqueta: "=", accion: "igual", nombre: "Calcular", tipo: "acento" }],
];

const CIENTIFICAS: Tecla[][] = [
  [{ etiqueta: "(", texto: "(", nombre: "Abrir paréntesis" }, { etiqueta: ")", texto: ")", nombre: "Cerrar paréntesis" }, { etiqueta: "x²", texto: "^2", nombre: "Al cuadrado" }, { etiqueta: "xʸ", texto: "^", nombre: "Potencia" }, { etiqueta: "√", texto: "√(", nombre: "Raíz cuadrada" }],
  [{ etiqueta: "sin", texto: "sin(" }, { etiqueta: "cos", texto: "cos(" }, { etiqueta: "tan", texto: "tan(" }, { etiqueta: "π", texto: "π", nombre: "Pi" }, { etiqueta: "³√", texto: "cbrt(", nombre: "Raíz cúbica" }],
  [{ etiqueta: "sin⁻¹", texto: "asin(", nombre: "Arcoseno" }, { etiqueta: "cos⁻¹", texto: "acos(", nombre: "Arcocoseno" }, { etiqueta: "tan⁻¹", texto: "atan(", nombre: "Arcotangente" }, { etiqueta: "e", texto: "e", nombre: "Número e" }, { etiqueta: "|x|", texto: "abs(", nombre: "Valor absoluto" }],
  [{ etiqueta: "ln", texto: "ln(", nombre: "Logaritmo natural" }, { etiqueta: "log", texto: "log(", nombre: "Logaritmo base 10" }, { etiqueta: "10ˣ", texto: "10^", nombre: "Diez a la" }, { etiqueta: "eˣ", texto: "exp(", nombre: "e a la" }, { etiqueta: "n!", texto: "!", nombre: "Factorial" }],
];

/**
 * Como en la calculadora de Windows: los números son la tecla más clara y en negrita, los operadores y las
 * funciones quedan más discretos y «=» lleva el color de acento. Los tonos salen del color del texto, así
 * que valen igual en tema claro y oscuro.
 */
const tono = (n: number) => `bg-[color-mix(in_srgb,var(--text-primary)_${n}%,transparent)]`;
const ESTILO_TECLA: Record<NonNullable<Tecla["tipo"]>, string> = {
  numero: `${tono(11)} hover:bg-[color-mix(in_srgb,var(--text-primary)_16%,transparent)] active:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)] text-[20px] font-semibold`,
  operador: `${tono(6)} hover:bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] text-[18px]`,
  funcion: `${tono(6)} hover:bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] text-[15px]`,
  acento: "bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-pressed text-[24px] font-semibold",
};

/** /calculadora — normal y científica, con historial. Se puede escribir con el teclado o pulsar los botones. */
export function PaginaCalculadora() {
  const [modo, setModo] = useState<Modo>("normal");
  const [grados, setGrados] = useState(true);
  const [expr, setExpr] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ans, setAns] = useState(0);
  const [historial, setHistorial] = useState<{ expr: string; res: string }[]>([]);
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => campo.current?.focus(), []);

  /** Vista previa mientras se escribe: si todavía no se puede calcular, simplemente no se muestra. */
  const vista = useMemo(() => {
    if (!expr.trim()) return null;
    try {
      return formatear(evaluar(expr, { grados, ans }));
    } catch {
      return null;
    }
  }, [expr, grados, ans]);

  const insertar = (texto: string) => {
    const el = campo.current;
    // Tras un resultado, un número o una función empieza una cuenta nueva; un operador sigue con el resultado.
    let base = expr;
    let ini = el?.selectionStart ?? expr.length;
    let fin = el?.selectionEnd ?? expr.length;
    if (resultado !== null) {
      const sigue = /^[+\-−×÷*/^%!]/.test(texto);
      base = sigue ? resultado : "";
      ini = fin = base.length;
      setResultado(null);
    }
    setError(null);
    const nuevo = base.slice(0, ini) + texto + base.slice(fin);
    setExpr(nuevo);
    requestAnimationFrame(() => {
      el?.focus();
      const p = ini + texto.length;
      el?.setSelectionRange(p, p);
    });
  };

  const calcular = () => {
    if (!expr.trim()) return;
    try {
      const n = evaluar(expr, { grados, ans });
      const texto = formatear(n);
      setResultado(texto);
      setAns(n);
      setError(null);
      setHistorial((h) => [{ expr, res: texto }, ...h].slice(0, 30));
    } catch (e) {
      setResultado(null);
      setError(e instanceof ErrorCalculo ? e.message : "No se pudo calcular");
    }
  };

  const limpiar = () => {
    setExpr("");
    setResultado(null);
    setError(null);
    campo.current?.focus();
  };

  const pulsar = (t: Tecla) => {
    if (t.accion === "borrar") return limpiar();
    if (t.accion === "atras") {
      if (resultado !== null) return limpiar();
      const el = campo.current;
      const ini = el?.selectionStart ?? expr.length;
      const fin = el?.selectionEnd ?? expr.length;
      const desde = ini === fin ? Math.max(0, ini - 1) : ini;
      setExpr(expr.slice(0, desde) + expr.slice(fin));
      setError(null);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(desde, desde);
      });
      return;
    }
    if (t.accion === "igual") return calcular();
    if (t.accion === "ans") return insertar("Ans");
    if (t.texto) insertar(t.texto);
  };

  const copiar = async () => {
    if (resultado === null) return;
    try {
      await navigator.clipboard.writeText(resultado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sin permiso del portapapeles: no pasa nada */
    }
  };

  const boton = (t: Tecla, i: number) => (
    <button
      key={`${t.etiqueta}-${i}`}
      type="button"
      onClick={() => pulsar(t)}
      aria-label={t.nombre ?? t.etiqueta}
      className={clsx(
        "rounded-control flex h-14 select-none items-center justify-center text-fg transition-[background-color,transform] duration-exit ease-fluent active:scale-[0.97]",
        ESTILO_TECLA[t.tipo ?? "numero"],
        t.tipo !== "acento" && "border border-stroke",
      )}
    >
      {t.etiqueta}
    </button>
  );

  return (
    <PlantillaPagina
      migas={[{ etiqueta: "Calculadora" }]}
      titulo="Calculadora"
      descripcion="Normal y científica. Puedes pulsar los botones o escribir con el teclado."
      accion={
        <SegmentedControl<Modo>
          label="Tipo de calculadora"
          etiquetaVisible={false}
          value={modo}
          options={[
            { value: "normal", label: "Normal" },
            { value: "cientifica", label: "Científica" },
          ]}
          onChange={setModo}
        />
      }
      principal={
        <Card className={clsx("mx-auto w-full overflow-hidden", modo === "cientifica" ? "max-w-[820px]" : "max-w-[420px]")}>
          {/* Pantalla: la cuenta arriba, en pequeño, y debajo el resultado en grande (como la calculadora de Windows). */}
          <div className="px-5 pb-3 pt-4" style={{ backgroundImage: "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 14%, transparent), transparent)" }}>
            <div className="flex h-6 items-center justify-between">
              {modo === "cientifica" ? (
                <button type="button" onClick={() => setGrados((g) => !g)} title="Cambiar entre grados y radianes" aria-label={`Ángulos en ${grados ? "grados" : "radianes"}. Pulsa para cambiar`} className="rounded-control h-6 border border-stroke px-2 text-caption text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                  {grados ? "Grados" : "Radianes"}
                </button>
              ) : (
                <span />
              )}
              <Button variant="subtle" className="h-6 px-2 text-caption" onClick={copiar} disabled={resultado === null}>{copiado ? "Copiado" : "Copiar"}</Button>
            </div>
            <input
              ref={campo}
              value={expr}
              onChange={(e) => {
                setExpr(e.target.value);
                setResultado(null);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  calcular();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  limpiar();
                }
              }}
              aria-label="Operación"
              placeholder="0"
              spellCheck={false}
              autoComplete="off"
              inputMode="text"
              className={clsx("tabular mt-1 w-full bg-transparent text-right focus-visible:outline-none placeholder:text-fg-tertiary", resultado !== null ? "text-[20px] text-fg-secondary" : "text-[40px] font-light leading-[52px] text-fg")}
            />
            <div className="flex min-h-[52px] items-end justify-end" role="status" aria-live="polite">
              {error ? (
                <span className="text-body text-danger">{error}</span>
              ) : resultado !== null ? (
                <span className="tabular truncate text-[44px] font-light leading-[52px] text-fg">{resultado}</span>
              ) : vista !== null && /[+\-−×÷*/^%!()a-zπ√]/.test(expr.replace(/^-/, "")) ? (
                <span className="tabular truncate text-[20px] text-fg-secondary">= {vista}</span>
              ) : null}
            </div>
          </div>

          <div className={clsx("grid gap-1.5 p-3 pt-1", modo === "cientifica" ? "min-[760px]:grid-cols-[1.25fr_1fr]" : "")}>
            {modo === "cientifica" && (
              <div className="grid grid-cols-5 gap-1.5 self-start">
                {CIENTIFICAS.flat().map((t, i) => boton({ ...t, tipo: "funcion" }, i))}
              </div>
            )}
            <div className="grid grid-cols-4 gap-1.5">{NUMERICAS.flat().map(boton)}</div>
          </div>
        </Card>
      }
      lateral={
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-body font-semibold text-fg">Historial</h2>
            {historial.length > 0 && (
              <Button variant="subtle" className="h-7" onClick={() => setHistorial([])}>Borrar</Button>
            )}
          </div>
          {historial.length === 0 ? (
            <p className="text-body text-fg-secondary">Tus cuentas aparecerán aquí.</p>
          ) : (
            <ul className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
              {historial.map((h, i) => (
                <li key={`${h.expr}-${i}`}>
                  <button type="button" onClick={() => insertar(h.res)} title="Usar este resultado" className="rounded-control reveal flex w-full flex-col items-end px-2 py-1.5 text-right transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                    <span className="tabular w-full truncate text-caption text-fg-secondary">{h.expr}</span>
                    <span className="tabular text-body font-semibold text-fg">= {h.res}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      }
    />
  );
}
