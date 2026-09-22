"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { InfoBar, type InfoBarSeverity } from "@/components/fluent/InfoBar";
import { ExpansorAjuste, FilaAjuste } from "@/components/fluent/TarjetaAjuste";
import { saveBlob } from "@/services/documents/download";
import { useCanalesStore } from "@/store/canales-store";

/** Canales de YouTube: exportar, importar y restaurar los sugeridos. */
export function AjusteCanales() {
  const canales = useCanalesStore((s) => s.canales);
  const [aviso, setAviso] = useState<{ severidad: InfoBarSeverity; titulo: string; texto?: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => useCanalesStore.getState().iniciar(), []);

  const exportar = () => {
    saveBlob(new Blob([useCanalesStore.getState().exportarCanales()], { type: "application/json" }), "nexushub-canales.json");
    setAviso({ severidad: "success", titulo: "Lista exportada.", texto: "Se guardó nexushub-canales.json; puedes pasárselo a otra persona o importarlo en otro equipo." });
  };

  const importar = async (file: File) => {
    if (file.size > 1024 * 1024) return setAviso({ severidad: "error", titulo: "Ese archivo es demasiado grande.", texto: "Un archivo de canales pesa unos pocos KB." });
    const r = useCanalesStore.getState().importarCanales(await file.text());
    setAviso(
      r.ok
        ? {
            severidad: "success",
            titulo: `Se agregaron ${r.agregados} ${r.agregados === 1 ? "canal" : "canales"}.`,
            texto: [r.repetidos > 0 ? `${r.repetidos} ya los seguías o no cabían (máximo 40).` : "", r.invalidos > 0 ? `${r.invalidos} ${r.invalidos === 1 ? "entrada del archivo no era válida y se ignoró" : "entradas del archivo no eran válidas y se ignoraron"}.` : ""].filter(Boolean).join(" ") || undefined,
          }
        : { severidad: "error", titulo: r.error },
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <ExpansorAjuste
        id="canales"
        glifo="video"
        titulo="Canales de YouTube"
        descripcion={`Sigues ${canales.length} ${canales.length === 1 ? "canal" : "canales"}. Puedes copiar tu lista a otro equipo.`}
        filas={
          <>
            <FilaAjuste titulo="Exportar mis canales" descripcion="Guarda tu lista en un archivo nexushub-canales.json.">
              <Button onClick={exportar}>Exportar</Button>
            </FilaAjuste>
            <FilaAjuste titulo="Importar canales" descripcion="Añade los canales de un archivo nexushub-canales.json a tu lista.">
              <Button onClick={() => archivo.current?.click()}>Importar</Button>
            </FilaAjuste>
            <FilaAjuste titulo="Restaurar los canales sugeridos" descripcion="Reemplaza tu lista por la que viene de fábrica.">
              {confirmar ? (
                <>
                  <span className="text-caption text-fg-secondary">¿Reemplazar tu lista?</span>
                  <Button
                    className="h-7 bg-[var(--error)] text-black hover:bg-[var(--error)]"
                    onClick={() => {
                      useCanalesStore.getState().restaurarSugeridos();
                      setConfirmar(false);
                      setAviso({ severidad: "success", titulo: "Se restauraron los canales sugeridos." });
                    }}
                  >
                    Sí, reemplazar
                  </Button>
                  <Button variant="subtle" className="h-7" onClick={() => setConfirmar(false)}>No</Button>
                </>
              ) : (
                <Button onClick={() => setConfirmar(true)}>Restaurar</Button>
              )}
            </FilaAjuste>
          </>
        }
      />
      <input ref={archivo} type="file" accept="application/json,.json" className="hidden" aria-label="Importar canales desde un archivo JSON" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ""; }} />
      {aviso && <InfoBar severity={aviso.severidad} title={aviso.titulo} onClose={() => setAviso(null)} className="mt-1">{aviso.texto}</InfoBar>}
    </div>
  );
}
