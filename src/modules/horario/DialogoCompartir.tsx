"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { useT } from "@/lib/i18n";
import { codigoDeHorario, fusionarClases, leerCodigoDeHorario, leerHorarioCompartido, MAX_BYTES_HORARIO, nombreDeArchivoHorario, textoDeHorario, type LecturaHorario, type ModoImportar } from "@/lib/horario/compartir";
import { descargar } from "@/services/documents/download";
import { useHorarioStore } from "@/store/horario-store";

/** Lo que se pegó puede ser un código («NEXO-H1:…») o el contenido de un archivo de horario (empieza con «{»). */
function leerPegado(texto: string): LecturaHorario | null {
  const t = texto.trim();
  if (!t) return null;
  const id = () => crypto.randomUUID();
  return t.startsWith("{") ? leerHorarioCompartido(t, id) : leerCodigoDeHorario(t, id);
}

/** «Compartir horario»: manda el tuyo a un compañero (archivo o código para pegar en un mensaje) o importa el que te mandaron. */
export function DialogoCompartir({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const t = useT();
  const clases = useHorarioStore((s) => s.clases);
  const agregar = useHorarioStore((s) => s.agregar);
  const reemplazar = useHorarioStore((s) => s.reemplazar);
  const entrada = useRef<HTMLInputElement>(null);
  const [pegado, setPegado] = useState("");
  const [desdeArchivo, setDesdeArchivo] = useState<LecturaHorario | null>(null);
  const [modo, setModo] = useState<ModoImportar>("anadir");
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  const lectura = desdeArchivo ?? leerPegado(pegado);
  const resultado = useMemo(() => (lectura?.ok ? fusionarClases(clases, lectura.clases, modo) : null), [lectura, clases, modo]);

  const cerrar = () => {
    setPegado("");
    setDesdeArchivo(null);
    setAviso(null);
    setModo("anadir");
    alCerrar();
  };

  const guardarArchivo = async () => {
    setAviso(null);
    try {
      const r = await descargar(new Blob([textoDeHorario(clases)], { type: "application/json" }), nombreDeArchivoHorario());
      if (!r.cancelado) setAviso({ tipo: "success", texto: r.ruta ? t("Horario guardado en «{ruta}».", { ruta: r.ruta }) : t("Horario guardado.") });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : t("No se pudo guardar el horario.") });
    }
  };

  const copiarCodigo = async () => {
    setAviso(null);
    try {
      await navigator.clipboard.writeText(codigoDeHorario(clases));
      setAviso({ tipo: "success", texto: t("Código copiado. Pégalo en un mensaje para tu compañero.") });
    } catch {
      setAviso({ tipo: "error", texto: t("No se pudo copiar. Guarda el horario como archivo y mándalo.") });
    }
  };

  const elegirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setAviso(null);
    if (archivo.size > MAX_BYTES_HORARIO) return setDesdeArchivo({ ok: false, motivo: "El archivo es demasiado grande para ser un horario de Nexo." });
    setPegado("");
    setDesdeArchivo(leerHorarioCompartido(await archivo.text(), () => crypto.randomUUID()));
  };

  const importar = () => {
    if (!lectura?.ok) return;
    const sinId = lectura.clases.map(({ id, ...resto }) => (void id, resto));
    if (modo === "reemplazar") reemplazar(sinId);
    else agregar(sinId);
    cerrar();
  };

  return (
    <Dialog open={abierto} onClose={cerrar} title={t("Compartir horario")} maxWidth={560}>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2" aria-labelledby="enviar-horario">
          <h3 id="enviar-horario" className="text-body font-semibold text-fg">
            {t("Mandar mi horario")}
          </h3>
          <p className="text-caption text-fg-secondary">{t("Solo viaja el horario: nada de tu perfil, tu calendario ni tus notas.")}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void guardarArchivo()} disabled={clases.length === 0}>
              {t("Guardar como archivo")}
            </Button>
            <Button onClick={() => void copiarCodigo()} disabled={clases.length === 0}>
              {t("Copiar código")}
            </Button>
          </div>
          {clases.length === 0 && <p className="text-caption text-fg-tertiary">{t("Todavía no tienes clases que compartir.")}</p>}
        </section>

        <section className="flex flex-col gap-2 border-t border-stroke pt-4" aria-labelledby="recibir-horario">
          <h3 id="recibir-horario" className="text-body font-semibold text-fg">
            {t("Importar el horario de un compañero")}
          </h3>
          <label className="text-caption text-fg-secondary" htmlFor="codigo-horario">
            {t("Pega aquí el código que te mandaron")}
          </label>
          <textarea
            id="codigo-horario"
            value={pegado}
            rows={3}
            spellCheck={false}
            placeholder="NEXO-H1:…"
            onChange={(e) => {
              setDesdeArchivo(null);
              setPegado(e.target.value);
            }}
            className="rounded-input w-full resize-none border border-stroke bg-layer-alt p-2 font-mono text-caption text-fg placeholder:text-fg-tertiary focus-visible:border-accent focus-visible:outline-none"
          />
          <div>
            <Button onClick={() => entrada.current?.click()}>{t("O elige un archivo…")}</Button>
            <input ref={entrada} type="file" accept="application/json,.json" className="hidden" aria-label={t("Elegir un archivo de horario")} onChange={(e) => { void elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
          </div>

          {lectura && !lectura.ok && <InfoBar severity="error" title={t(lectura.motivo)} />}
          {lectura?.ok && resultado && (
            <div className="flex flex-col gap-3 rounded-control border border-stroke bg-layer-alt p-3">
              <p className="text-body text-fg">
                {lectura.clases.length === 1 ? t("Encontré 1 clase.") : t("Encontré {n} clases.", { n: lectura.clases.length })}
                {lectura.descartadas > 0 && ` ${t("({n} no se pudieron leer y se dejaron fuera).", { n: lectura.descartadas })}`}
              </p>
              <SegmentedControl<ModoImportar>
                label={t("Cómo importarlo")}
                value={modo}
                options={[
                  { value: "anadir", label: t("Añadir a mi horario") },
                  { value: "reemplazar", label: t("Reemplazar mi horario") },
                ]}
                onChange={setModo}
              />
              <p className="text-caption text-fg-secondary">
                {modo === "reemplazar"
                  ? t("Tu horario actual ({n} clases) se cambiará por este.", { n: clases.length })
                  : resultado.repetidas > 0
                    ? t("Se añadirán {n} clases nuevas; {r} ya las tenías.", { n: resultado.agregadas, r: resultado.repetidas })
                    : t("Se añadirán {n} clases nuevas.", { n: resultado.agregadas })}
              </p>
              <div className="flex justify-end">
                <Button variant="accent" onClick={importar} disabled={modo === "anadir" && resultado.agregadas === 0}>
                  {t("Importar")}
                </Button>
              </div>
            </div>
          )}
        </section>

        {aviso && <InfoBar severity={aviso.tipo} title={aviso.texto} onClose={() => setAviso(null)} />}
      </div>
    </Dialog>
  );
}
