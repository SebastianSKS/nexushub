"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { RadioCards } from "@/components/fluent/RadioCards";
import { TextInput } from "@/components/fluent/TextInput";
import { useT } from "@/lib/i18n";
import { MAX_NOMBRE_SEMESTRE, sugerirNombre } from "@/lib/horario/semestres";
import { archivarCarpetas, carpetasDisponibles, listarCarpetas, nombreCarpetaDe, type Carpeta } from "@/services/carpetas";
import { useHorarioStore } from "@/store/horario-store";
import { useSemestresStore } from "@/store/semestres-store";

/** Cómo se llena el horario del semestre nuevo. */
export type InicioSemestre = "escanear" | "importar" | "copiar" | "vacio";

/**
 * Empezar un semestre: nombre, cómo llenar el horario y qué hacer con las carpetas del que termina. El horario de ahora
 * se guarda siempre; las carpetas solo se mueven si se marcan.
 */
export function DialogoNuevoSemestre({ abierto, onCerrar, onListo }: { abierto: boolean; onCerrar: () => void; onListo: (inicio: InicioSemestre) => void }) {
  const t = useT();
  const actual = useSemestresStore((s) => s.actual);
  const clases = useHorarioStore((s) => s.clases);
  const [nombre, setNombre] = useState("");
  const [inicio, setInicio] = useState<InicioSemestre>("escanear");
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  // Si algo no se pudo mover, se dice antes de seguir (el semestre ya quedó guardado).
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setNombre(sugerirNombre(useSemestresStore.getState().actual));
    setInicio("escanear");
    setProblema(null);
    setOcupado(false);
    setCarpetas([]);
    setMarcadas([]);
    if (!carpetasDisponibles()) return;
    let cancelado = false;
    // Solo se ofrecen las carpetas de las materias del semestre que termina; las demás (propias) no se tocan.
    const deEsteSemestre = new Set(useHorarioStore.getState().clases.map((c) => nombreCarpetaDe(c.materia).toLowerCase()));
    listarCarpetas()
      .then((todas) => {
        if (cancelado) return;
        const suyas = todas.filter((c) => deEsteSemestre.has(c.nombre.toLowerCase()));
        setCarpetas(suyas);
        setMarcadas(suyas.map((c) => c.nombre));
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [abierto]);

  const confirmar = async () => {
    setOcupado(true);
    const terminado = actual;
    useSemestresStore.getState().empezar(nombre, inicio === "copiar" ? clases : []);
    if (marcadas.length > 0) {
      try {
        const r = await archivarCarpetas(terminado, marcadas);
        if (r.fallidas.length > 0) return setProblema(t("No se pudieron mover: {lista}. Quizá tienen un archivo abierto; siguen donde estaban.", { lista: r.fallidas.join(", ") }));
      } catch (e) {
        return setProblema(e instanceof Error ? e.message : t("No se pudieron mover las carpetas; siguen donde estaban."));
      }
    }
    onListo(inicio);
  };

  const alternar = (n: string) => setMarcadas((m) => (m.includes(n) ? m.filter((x) => x !== n) : [...m, n]));

  return (
    <Dialog open={abierto} onClose={problema ? () => onListo(inicio) : onCerrar} title={t("Empezar nuevo semestre")} maxWidth={560}>
      {problema ? (
        <div className="flex flex-col gap-4">
          <InfoBar severity="warning" title={t("El semestre quedó guardado.")}>
            {problema}
          </InfoBar>
          <div className="flex justify-end">
            <Button variant="accent" onClick={() => onListo(inicio)}>
              {t("Continuar")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">
            {clases.length > 0 ? t("El horario de «{nombre}» se guarda: podrás verlo o volver a usarlo cuando quieras.", { nombre: actual }) : t("Ponle nombre al semestre que empiezas.")}
          </p>
          <TextInput label={t("Nombre del semestre nuevo")} value={nombre} maxLength={MAX_NOMBRE_SEMESTRE} onChange={(e) => setNombre(e.target.value)} />
          <RadioCards
            label={t("¿Cómo llenas el horario?")}
            value={inicio}
            onChange={(v) => {
              setInicio(v);
              // Si se copia el horario, lo normal es seguir con las mismas materias: sus carpetas se quedan.
              setMarcadas(v === "copiar" ? [] : carpetas.map((c) => c.nombre));
            }}
            options={[
              { value: "escanear", title: t("Escanear la imagen"), description: t("Eliges la foto del horario nuevo y se llena solo.") },
              { value: "importar", title: t("Usar el de un compañero"), description: t("Pegas su código o abres su archivo.") },
              ...(clases.length > 0 ? [{ value: "copiar" as const, title: t("Copiar el actual"), description: t("Empiezas con las mismas clases y cambias lo que haga falta.") }] : []),
              { value: "vacio", title: t("Empezar vacío"), description: t("Lo llenas después.") },
            ]}
          />
          {carpetas.length > 0 && (
            <fieldset className="rounded-input border border-stroke bg-layer p-3">
              <legend className="px-1 text-body font-semibold text-fg">{t("Archivar carpetas del semestre que termina")}</legend>
              <p className="mb-2 text-caption text-fg-secondary">{t("Las marcadas se mueven a Tareas › Anteriores › {nombre}. No se borra nada.", { nombre: actual })}</p>
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                {carpetas.map((c) => (
                  <label key={c.nombre} className="flex cursor-pointer items-center gap-2 text-body text-fg">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={marcadas.includes(c.nombre)} onChange={() => alternar(c.nombre)} />
                    <span className="truncate">{c.nombre}</span>
                    <span className="ml-auto shrink-0 text-caption text-fg-tertiary">{t("Archivos: {n}", { n: c.archivos })}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={onCerrar}>{t("Cancelar")}</Button>
            <Button variant="accent" disabled={!nombre.trim() || ocupado} onClick={() => void confirmar()}>
              {t("Empezar semestre")}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
