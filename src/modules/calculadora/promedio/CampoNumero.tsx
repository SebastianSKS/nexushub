"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { escribirNumero, leerNumeroEscrito } from "@/lib/promedio";

interface CampoNumeroProps {
  /** Nombre para lectores de pantalla (el campo no lleva etiqueta visible: va en una fila con encabezado). */
  etiqueta: string;
  /** El valor guardado; null = vacío. */
  valor: number | null;
  /** Se llama con el número ya leído (o null si se vació el campo). Solo con valores válidos. */
  onCambio: (valor: number | null) => void;
  maximo?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Campo de número que deja escribir con calma: «8.», «8,5» o vacío no se «corrigen» mientras se teclea, y solo se guarda lo que
 * es un número dentro del rango. Si lo escrito no vale, el campo se marca en rojo y se conserva lo último bueno.
 */
export function CampoNumero({ etiqueta, valor, onCambio, maximo, placeholder, className }: CampoNumeroProps) {
  const [texto, setTexto] = useState(valor === null ? "" : escribirNumero(valor, 2));
  const [invalido, setInvalido] = useState(false);

  // Si el valor cambia desde fuera (otra materia, cambio de escala), el campo lo refleja.
  useEffect(() => {
    setTexto((actual) => {
      const leido = leerNumeroEscrito(actual);
      return leido === valor || (leido !== null && Number.isNaN(leido) && valor === null) ? actual : valor === null ? "" : escribirNumero(valor, 2);
    });
    setInvalido(false);
  }, [valor]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={etiqueta}
      aria-invalid={invalido || undefined}
      placeholder={placeholder}
      value={texto}
      onChange={(e) => {
        const nuevo = e.target.value;
        setTexto(nuevo);
        const n = leerNumeroEscrito(nuevo);
        if (n === null) {
          setInvalido(false);
          onCambio(null);
        } else if (Number.isNaN(n) || n < 0 || (maximo !== undefined && n > maximo)) {
          setInvalido(true);
        } else {
          setInvalido(false);
          onCambio(n);
        }
      }}
      onBlur={() => {
        // Al salir del campo se deja escrito el valor bueno (por ejemplo «8,50» → «8.5»).
        setInvalido(false);
        setTexto(valor === null ? "" : escribirNumero(valor, 2));
      }}
      className={clsx(
        "rounded-input h-8 w-full border bg-layer-alt px-2 text-right text-body tabular-nums text-fg transition-colors duration-exit ease-fluent placeholder:text-fg-tertiary hover:bg-layer focus-visible:border-accent focus-visible:outline-none",
        invalido ? "border-danger" : "border-stroke",
        className,
      )}
    />
  );
}
