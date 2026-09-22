"use client";

import { useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { saveBlob } from "@/services/documents/download";
import { useSelectorArchivos } from "@/hooks/useSelectorArchivos";
import { generarIcs, parsearIcs } from "@/lib/calendario/ics";
import { useCalendarioStore } from "@/store/calendario-store";

/** Exportar el calendario a un .ics, o importar uno de otra aplicación (Google Calendar, Outlook…). */
export function RespaldoCalendario() {
  const amigos = useCalendarioStore((s) => s.amigos);
  const eventos = useCalendarioStore((s) => s.eventos);
  const [resultado, setResultado] = useState<{ amigos: number; eventos: number; omitidos: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportar = () => {
    const texto = generarIcs(amigos, eventos);
    const blob = new Blob([texto], { type: "text/calendar;charset=utf-8" });
    saveBlob(blob, "nexushub-calendario.ics");
  };

  const importar = async (files: File[]) => {
    const archivo = files[0];
    if (!archivo) return;
    setError(null);
    try {
      const texto = await archivo.text();
      const { amigos: nuevosAmigos, eventos: nuevosEventos, omitidos } = parsearIcs(texto);
      if (nuevosAmigos.length === 0 && nuevosEventos.length === 0) {
        setError("No encontré nada que importar en ese archivo.");
        return;
      }
      const { amigos: aAgregados, eventos: eAgregados } = useCalendarioStore.getState().importar(nuevosAmigos, nuevosEventos);
      setResultado({ amigos: aAgregados, eventos: eAgregados, omitidos: omitidos + (nuevosAmigos.length - aAgregados) + (nuevosEventos.length - eAgregados) });
    } catch {
      setError("No pude leer ese archivo. Comprueba que sea un .ics válido.");
    }
  };

  const { abrir, entrada } = useSelectorArchivos(importar, ".ics", false);

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-body font-semibold text-fg">
        <Glifo nombre="carpeta" tam={16} className="text-accent-text" /> Copia de seguridad
      </h2>
      <p className="mb-3 text-caption text-fg-secondary">Exporta tu calendario o impórtalo desde Google Calendar, Outlook u otra aplicación (.ics).</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportar} disabled={amigos.length === 0 && eventos.length === 0} icon={<Glifo nombre="descargar" />}>
          Exportar (.ics)
        </Button>
        <Button onClick={abrir} icon={<Glifo nombre="cargar" />}>
          Importar (.ics)
        </Button>
      </div>
      {entrada}
      {error && (
        <div className="mt-3">
          <InfoBar severity="warning" title={error} />
        </div>
      )}

      <Dialog open={resultado !== null} onClose={() => setResultado(null)} title="Importación terminada" maxWidth={420}>
        {resultado && (
          <>
            <p className="text-body text-fg-secondary">
              Se añadieron {resultado.amigos} {resultado.amigos === 1 ? "cumpleaños" : "cumpleaños"} y {resultado.eventos} {resultado.eventos === 1 ? "evento" : "eventos"}.
              {resultado.omitidos > 0 && ` Se dejaron fuera ${resultado.omitidos} ${resultado.omitidos === 1 ? "entrada repetida o incompleta" : "entradas repetidas o incompletas"}.`}
            </p>
            <div className="mt-5 flex justify-end">
              <Button variant="accent" onClick={() => setResultado(null)}>Entendido</Button>
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}
