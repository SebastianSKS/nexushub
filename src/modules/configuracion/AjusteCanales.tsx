"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { InfoBar, type InfoBarSeverity } from "@/components/fluent/InfoBar";
import { ExpansorAjuste, FilaAjuste } from "@/components/fluent/TarjetaAjuste";
import { saveBlob } from "@/services/documents/download";
import { useCanalesStore } from "@/store/canales-store";

/** Canales de YouTube: exportar, importar y restaurar los sugeridos. */
export function AjusteCanales() {
  const t = useT();
  const canales = useCanalesStore((s) => s.canales);
  const [aviso, setAviso] = useState<{ severidad: InfoBarSeverity; titulo: string; texto?: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => useCanalesStore.getState().iniciar(), []);

  const exportar = () => {
    saveBlob(new Blob([useCanalesStore.getState().exportarCanales()], { type: "application/json" }), "nexushub-canales.json");
    setAviso({ severidad: "success", titulo: t("Lista exportada."), texto: t("Se guardó nexushub-canales.json; puedes pasárselo a otra persona o importarlo en otro equipo.") });
  };

  const importar = async (file: File) => {
    if (file.size > 1024 * 1024) return setAviso({ severidad: "error", titulo: t("Ese archivo es demasiado grande."), texto: t("Un archivo de canales pesa unos pocos KB.") });
    const r = useCanalesStore.getState().importarCanales(await file.text());
    setAviso(
      r.ok
        ? {
            severidad: "success",
            titulo: t("Se agregaron {n} {canales}.", { n: r.agregados, canales: r.agregados === 1 ? t("canal") : t("canales") }),
            texto: [r.repetidos > 0 ? t("{n} ya los seguías o no cabían (máximo 40).", { n: r.repetidos }) : "", r.invalidos > 0 ? (r.invalidos === 1 ? t("1 entrada del archivo no era válida y se ignoró.") : t("{n} entradas del archivo no eran válidas y se ignoraron.", { n: r.invalidos })) : ""].filter(Boolean).join(" ") || undefined,
          }
        : { severidad: "error", titulo: r.error },
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <ExpansorAjuste
        id="canales"
        glifo="video"
        titulo={t("Canales de YouTube")}
        descripcion={t("Sigues {n} {canales}. Puedes copiar tu lista a otro equipo.", { n: canales.length, canales: canales.length === 1 ? t("canal") : t("canales") })}
        filas={
          <>
            <FilaAjuste titulo={t("Exportar mis canales")} descripcion={t("Guarda tu lista en un archivo nexushub-canales.json.")}>
              <Button onClick={exportar}>{t("Exportar")}</Button>
            </FilaAjuste>
            <FilaAjuste titulo={t("Importar canales")} descripcion={t("Añade los canales de un archivo nexushub-canales.json a tu lista.")}>
              <Button onClick={() => archivo.current?.click()}>{t("Importar")}</Button>
            </FilaAjuste>
            <FilaAjuste titulo={t("Restaurar los canales sugeridos")} descripcion={t("Reemplaza tu lista por la que viene de fábrica.")}>
              {confirmar ? (
                <>
                  <span className="text-caption text-fg-secondary">{t("¿Reemplazar tu lista?")}</span>
                  <Button
                    className="h-7 bg-[var(--error)] text-black hover:bg-[var(--error)]"
                    onClick={() => {
                      useCanalesStore.getState().restaurarSugeridos();
                      setConfirmar(false);
                      setAviso({ severidad: "success", titulo: t("Se restauraron los canales sugeridos.") });
                    }}
                  >
                    {t("Sí, reemplazar")}
                  </Button>
                  <Button variant="subtle" className="h-7" onClick={() => setConfirmar(false)}>{t("No")}</Button>
                </>
              ) : (
                <Button onClick={() => setConfirmar(true)}>{t("Restaurar")}</Button>
              )}
            </FilaAjuste>
          </>
        }
      />
      <input ref={archivo} type="file" accept="application/json,.json" className="hidden" aria-label={t("Importar canales desde un archivo JSON")} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ""; }} />
      {aviso && <InfoBar severity={aviso.severidad} title={aviso.titulo} onClose={() => setAviso(null)} className="mt-1">{aviso.texto}</InfoBar>}
    </div>
  );
}
