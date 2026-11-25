"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { useT } from "@/lib/i18n";
import type { Semestre } from "@/lib/horario/semestres";
import { archivarCarpetas, carpetasDisponibles, listarCarpetas, nombreCarpetaDe, recuperarCarpetas, type Carpeta } from "@/services/carpetas";
import { useHorarioStore } from "@/store/horario-store";
import { useSemestresStore } from "@/store/semestres-store";

/**
 * Recuperar un semestre guardado: vuelve a ser el horario actual y, si se quiere, sus carpetas regresan a «Mis tareas».
 * El horario que estaba puesto se guarda (y sus carpetas se pueden archivar en el mismo paso), así que se puede ir y volver.
 */
export function DialogoRecuperar({ semestre, guardadas, onCerrar, onHecho }: { semestre: Semestre | null; guardadas: Carpeta[]; onCerrar: () => void; onHecho: () => void }) {
  const t = useT();
  const actual = useSemestresStore((s) => s.actual);
  const clases = useHorarioStore((s) => s.clases);
  const [traer, setTraer] = useState(true);
  const [archivar, setArchivar] = useState(true);
  const [deAhora, setDeAhora] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const id = semestre?.id ?? null;

  useEffect(() => {
    if (!id) return;
    setTraer(true);
    setArchivar(true);
    setDeAhora([]);
    setOcupado(false);
    setProblema(null);
    if (!carpetasDisponibles()) return;
    let cancelado = false;
    const deEsteSemestre = new Set(useHorarioStore.getState().clases.map((c) => nombreCarpetaDe(c.materia).toLowerCase()));
    listarCarpetas()
      .then((todas) => !cancelado && setDeAhora(todas.filter((c) => deEsteSemestre.has(c.nombre.toLowerCase())).map((c) => c.nombre)))
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [id]);

  // Si los dos semestres se llaman igual compartirían carpeta en «Anteriores»: en ese caso no se ofrece archivar.
  const puedeArchivar = deAhora.length > 0 && !!semestre && nombreCarpetaDe(actual).toLowerCase() !== nombreCarpetaDe(semestre.nombre).toLowerCase();

  const confirmar = async () => {
    if (!semestre) return;
    setOcupado(true);
    const antes = actual;
    const porArchivar = puedeArchivar && archivar ? deAhora : [];
    useSemestresStore.getState().volverA(semestre.id);
    const fallidas: string[] = [];
    try {
      // Primero se apartan las de ahora, para que las que regresan encuentren su lugar libre.
      if (porArchivar.length > 0) fallidas.push(...(await archivarCarpetas(antes, porArchivar)).fallidas);
      if (traer && guardadas.length > 0) fallidas.push(...(await recuperarCarpetas(semestre.nombre)).fallidas);
    } catch (e) {
      return setProblema(e instanceof Error ? e.message : t("No se pudieron mover las carpetas; siguen donde estaban."));
    }
    if (fallidas.length > 0) return setProblema(t("No se pudieron mover: {lista}. Quizá tienen un archivo abierto; siguen donde estaban.", { lista: fallidas.join(", ") }));
    onHecho();
  };

  const casilla = (marcada: boolean, cambiar: (v: boolean) => void, titulo: string, detalle: string) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-input border border-stroke bg-layer p-3">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={marcada} onChange={(e) => cambiar(e.target.checked)} />
      <span className="min-w-0">
        <span className="block text-body text-fg">{titulo}</span>
        <span className="block text-caption text-fg-secondary">{detalle}</span>
      </span>
    </label>
  );

  return (
    <Dialog open={semestre !== null} onClose={problema ? onHecho : onCerrar} title={t("Recuperar «{nombre}»", { nombre: semestre?.nombre ?? "" })} maxWidth={520}>
      {problema ? (
        <div className="flex flex-col gap-4">
          <InfoBar severity="warning" title={t("El horario ya se recuperó.")}>
            {problema}
          </InfoBar>
          <div className="flex justify-end">
            <Button variant="accent" onClick={onHecho}>
              {t("Continuar")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">
            {clases.length > 0 ? t("Volverá a ser tu horario. El de «{nombre}» se guarda en semestres anteriores.", { nombre: actual }) : t("Volverá a ser tu horario.")}
          </p>
          {guardadas.length > 0 && casilla(traer, setTraer, t("Traer de vuelta sus carpetas ({n})", { n: guardadas.length }), guardadas.map((c) => c.nombre).join(" · "))}
          {puedeArchivar && casilla(archivar, setArchivar, t("Archivar las carpetas de «{nombre}» ({n})", { nombre: actual, n: deAhora.length }), deAhora.join(" · "))}
          <div className="flex justify-end gap-2">
            <Button onClick={onCerrar}>{t("Cancelar")}</Button>
            <Button variant="accent" disabled={ocupado} onClick={() => void confirmar()}>
              {t("Recuperar")}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
