"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { rutaDeInicio } from "@/components/shell/MemoriaSesion";

/** «/» no es una pantalla: redirige a la sección de inicio elegida en Configuración (por defecto, la última visitada; Video la primera vez). */
export default function Raiz() {
  const router = useRouter();
  useEffect(() => {
    router.replace(rutaDeInicio());
  }, [router]);
  return <p className="p-8 text-body text-fg-secondary">Abriendo NexusHub…</p>;
}
