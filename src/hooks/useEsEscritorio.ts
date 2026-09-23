"use client";

import { useEffect, useState } from "react";
import { esEscritorio } from "@/lib/entorno";

/**
 * ¿Está NexusHub en la aplicación de escritorio? `null` hasta que la pantalla se monta en el navegador:
 * al generar la página no se sabe, y decidirlo antes haría que lo dibujado no coincida con lo generado.
 */
export function useEsEscritorio(): boolean | null {
  const [valor, setValor] = useState<boolean | null>(null);
  useEffect(() => setValor(esEscritorio()), []);
  return valor;
}
