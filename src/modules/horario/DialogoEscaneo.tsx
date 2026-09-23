"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { ProgressBar } from "@/components/fluent/ProgressBar";
import { DIAS } from "@/lib/horario/horario";
import { ErrorEscaneo, escanearHorario, type ClaseEscaneada } from "@/services/horario/escaneo";
import { leerImagen, reconocerEnNavegador } from "@/services/horario/ocr-navegador";
import { useHorarioStore } from "@/store/horario-store";

type Fase = { tipo: "elegir" } | { tipo: "leyendo"; fraccion: number; texto: string } | { tipo: "revisar"; clases: ClaseEscaneada[] } | { tipo: "error"; mensaje: string };

/**
 * Escanear un horario a partir de una imagen: se elige (o se arrastra) la imagen, se lee, y ANTES de guardar
 * se muestra lo que se encontró para quitar lo que sobre. Después se puede corregir clase por clase.
 */
export function DialogoEscaneo({ abierto, onCerrar, onGuardado }: { abierto: boolean; onCerrar: () => void; onGuardado?: (materias: string[]) => void }) {
  const [fase, setFase] = useState<Fase>({ tipo: "elegir" });
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const hayHorario = useHorarioStore((s) => s.clases.length > 0);

  useEffect(() => {
    if (abierto) setFase({ tipo: "elegir" });
  }, [abierto]);

  const leer = async (archivo: File) => {
    if (!archivo.type.startsWith("image/")) {
      setFase({ tipo: "error", mensaje: "Ese archivo no es una imagen. Usa una captura o foto del horario (PNG, JPG…)." });
      return;
    }
    setFase({ tipo: "leyendo", fraccion: 0, texto: "Preparando el lector (la primera vez tarda unos segundos)…" });
    try {
      const img = await leerImagen(archivo);
      const clases = await escanearHorario(img, reconocerEnNavegador, (fraccion, texto) => setFase({ tipo: "leyendo", fraccion, texto }));
      setFase({ tipo: "revisar", clases });
    } catch (e) {
      setFase({ tipo: "error", mensaje: e instanceof ErrorEscaneo ? e.message : "No se pudo leer la imagen. Prueba con otra, más grande o más nítida." });
    }
  };

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setEncima(false);
    const archivo = e.dataTransfer.files[0];
    if (archivo) void leer(archivo);
  };

  const guardar = (modo: "reemplazar" | "agregar") => {
    if (fase.tipo !== "revisar") return;
    const datos = fase.clases.map(({ dudosa: _d, ...c }) => ({ ...c, aula: "" }));
    if (modo === "reemplazar") useHorarioStore.getState().reemplazar(datos);
    else useHorarioStore.getState().agregar(datos);
    onCerrar();
    onGuardado?.(datos.map((c) => c.materia));
  };

  const quitar = (i: number) => fase.tipo === "revisar" && setFase({ tipo: "revisar", clases: fase.clases.filter((_, k) => k !== i) });

  return (
    <Dialog open={abierto} onClose={onCerrar} title="Escanear horario" maxWidth={640}>
      {(fase.tipo === "elegir" || fase.tipo === "error") && (
        <div className="flex flex-col gap-4">
          {fase.tipo === "error" && <InfoBar severity="error" title="No pude leer el horario">{fase.mensaje}</InfoBar>}
          <div
            onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
            onDragLeave={() => setEncima(false)}
            onDrop={alSoltar}
            className={clsx("flex flex-col items-center gap-3 rounded-[8px] border-2 border-dashed px-6 py-10 text-center transition-colors duration-exit ease-fluent", encima ? "border-accent bg-layer-alt" : "border-stroke bg-layer")}
          >
            <Glifo nombre="camara" tam={28} className="text-accent-text" />
            <p className="text-body text-fg">Arrastra aquí la imagen de tu horario, o elígela</p>
            <Button variant="accent" onClick={() => entrada.current?.click()}>Elegir imagen</Button>
            <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void leer(f); }} />
          </div>
          <p className="text-caption text-fg-secondary">
            Funciona con horarios en forma de tabla: los días arriba, las horas a la izquierda y cada clase en un cuadro de color, como los de Excel. La imagen se lee en tu computadora; no se sube a ningún sitio. Cuanto más grande y nítida, mejor se lee.
          </p>
        </div>
      )}

      {fase.tipo === "leyendo" && (
        <div className="flex flex-col gap-3 py-6">
          <p className="text-body text-fg" role="status">{fase.texto}</p>
          <ProgressBar value={fase.fraccion * 100} label="Leyendo el horario" />
        </div>
      )}

      {fase.tipo === "revisar" && (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg">
            Encontré <strong>{fase.clases.length}</strong> {fase.clases.length === 1 ? "clase" : "clases"}. Quita las que no sean; después de guardar puedes tocar cualquiera para corregirla.
          </p>
          {fase.clases.some((c) => c.dudosa) && <InfoBar severity="warning" title="Algunas no se leyeron bien">Las marcadas con «Revisar» pueden tener el nombre o la clave con errores. Corrígelas después de guardar.</InfoBar>}
          <ul className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Clases encontradas">
            {fase.clases.map((c, i) => (
              <li key={`${c.dia}-${c.inicio}-${i}`} className="rounded-control flex items-center gap-3 border border-stroke bg-layer px-3 py-2">
                <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-fg">{c.materia}{c.codigo && <span className="ml-2 font-normal text-fg-tertiary">{c.codigo}</span>}</span>
                  <span className="block truncate text-caption text-fg-secondary">{DIAS[c.dia]} · {c.inicio} – {c.fin}{c.docente && ` · ${c.docente}`}</span>
                </span>
                {c.dudosa && <span className="shrink-0 rounded-full bg-layer-alt px-2 text-caption text-fg-secondary">Revisar</span>}
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${c.materia} del ${DIAS[c.dia]}`} title="Quitar" className="rounded-control flex h-8 w-8 shrink-0 items-center justify-center text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer-alt hover:text-fg">
                  <Glifo nombre="cerrar" tam={12} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setFase({ tipo: "elegir" })}>Probar con otra imagen</Button>
            {hayHorario && <Button onClick={() => guardar("agregar")} disabled={fase.clases.length === 0}>Añadir a mi horario</Button>}
            <Button variant="accent" onClick={() => guardar("reemplazar")} disabled={fase.clases.length === 0}>{hayHorario ? "Reemplazar mi horario" : "Guardar horario"}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
