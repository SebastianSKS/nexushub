"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { leerUltimaRuta } from "@/components/shell/MemoriaSesion";
import { RUTA_INICIAL } from "@/lib/rutas";

/** «/» no es una pantalla: redirige a la última sección visitada (o a Video la primera vez). */
export default function Raiz() {
  const router = useRouter();
  useEffect(() => {
    router.replace(leerUltimaRuta() ?? RUTA_INICIAL);
  }, [router]);
  return <p className="p-8 text-body text-fg-secondary">Abriendo NexusHub…</p>;
}
