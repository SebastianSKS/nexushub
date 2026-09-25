"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Switch } from "@/components/fluent/Switch";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { borrarIndice, cargarIndice, sincronizarIndice, useIndicePdfs } from "@/services/indice-pdfs";
import { useAjustesStore } from "@/store/ajustes-store";

/** «Buscar dentro de mis PDF»: lee el texto de los PDF de tus carpetas de materias, en este equipo, para encontrarlos con Ctrl+K. */
export function AjusteIndicePdfs() {
  const activo = useAjustesStore((s) => s.buscarEnPdfs);
  const cambiar = useAjustesStore((s) => s.cambiar);
  const { fase, hechos, total, pdfs, conTexto, paginas } = useIndicePdfs();
  const [ocupado, setOcupado] = useState(false);

  // Lo que ya se había leído en otras sesiones, para que el estado sea el de verdad desde que abres Configuración.
  useEffect(() => {
    void cargarIndice();
  }, []);

  const estado = !activo
    ? "Apagado: no se lee ningún PDF."
    : fase === "leyendo"
      ? `Leyendo tus PDF… ${hechos} de ${total}.`
      : fase === "inactivo" && pdfs === 0
        ? "Preparando…"
        : pdfs === 0
        ? "Aún no hay PDF en tus carpetas de materias."
        : `${conTexto} ${conTexto === 1 ? "PDF listo" : "PDF listos"} para buscar (${paginas} páginas).${pdfs > conTexto ? ` ${pdfs - conTexto} ${pdfs - conTexto === 1 ? "no tiene" : "no tienen"} texto que leer (escaneado o con contraseña).` : ""}`;

  return (
    <TarjetaAjuste
      glifo="buscar"
      titulo="Buscar dentro de mis PDF"
      descripcion={`Con Ctrl+K encuentras una palabra dentro de los PDF de tus carpetas de materias y se abren en esa página. Se lee en este equipo, nada se sube a internet. ${estado}`}
    >
      {activo && (
        <>
          <Button
            disabled={ocupado || fase === "leyendo"}
            onClick={() => {
              setOcupado(true);
              void sincronizarIndice().finally(() => setOcupado(false));
            }}
          >
            Buscar PDF nuevos
          </Button>
          <Button
            disabled={ocupado || fase === "leyendo"}
            onClick={() => {
              setOcupado(true);
              void borrarIndice()
                .then(() => sincronizarIndice())
                .finally(() => setOcupado(false));
            }}
          >
            Volver a leer todo
          </Button>
        </>
      )}
      <Switch checked={activo} onChange={(v) => cambiar({ buscarEnPdfs: v })} label="Buscar dentro de mis PDF" />
    </TarjetaAjuste>
  );
}
