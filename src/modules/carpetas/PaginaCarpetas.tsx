"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { LogoPrograma } from "@/components/fluent/LogoPrograma";
import { InfoBar } from "@/components/fluent/InfoBar";
import { TextInput } from "@/components/fluent/TextInput";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { cargarIconosProgramas, programaDeExtension } from "@/services/iconos-programas";
import { useHorarioStore } from "@/store/horario-store";
import {
  abrirEnSistema,
  borrarArchivo,
  borrarCarpeta,
  crearCarpeta,
  ErrorCarpetas,
  guardarArchivo,
  listarArchivos,
  listarCarpetas,
  nombreCarpetaDe,
  rutaBase,
  renombrarArchivo,
  renombrarCarpeta,
  tamano,
  type ArchivoCarpeta,
  type Carpeta,
} from "@/services/carpetas";
import { DialogoCarpetasHorario } from "./DialogoCarpetasHorario";
import { DialogoNuevoArchivo } from "./DialogoNuevoArchivo";

/** Un cuadro para escribir un nombre (nueva carpeta, renombrar…). Los errores del sistema se muestran ahí mismo. */
function DialogoNombre({ titulo, etiqueta, inicial, accion, onGuardar, onCerrar }: { titulo: string; etiqueta: string; inicial: string; accion: string; onGuardar: (nombre: string) => Promise<void>; onCerrar: () => void }) {
  const [texto, setTexto] = useState(inicial);
  const [error, setError] = useState<string>();
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return setError("Escribe un nombre.");
    setOcupado(true);
    try {
      await onGuardar(texto.trim());
      onCerrar();
    } catch (err) {
      setError(err instanceof ErrorCarpetas ? err.message : "No se pudo guardar.");
    } finally {
      setOcupado(false);
    }
  };
  return (
    <Dialog open onClose={onCerrar} title={titulo} maxWidth={420}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <TextInput label={etiqueta} value={texto} maxLength={100} autoFocus autoComplete="off" error={error} onChange={(e) => { setTexto(e.target.value); setError(undefined); }} />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={ocupado}>{accion}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function BotonIcono({ glifo, etiqueta, onClick, peligro }: { glifo: "editar" | "eliminar" | "carpeta"; etiqueta: string; onClick: () => void; peligro?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} title={etiqueta} className={clsx("rounded-control flex h-8 w-8 shrink-0 items-center justify-center text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer-alt", peligro ? "hover:text-danger" : "hover:text-fg")}>
      <Glifo nombre={glifo} tam={14} />
    </button>
  );
}

const fecha = (seg: number) => new Date(seg * 1000).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

type Dialogo = { tipo: "nueva" } | { tipo: "nuevo-archivo" } | { tipo: "renombrar-carpeta"; nombre: string } | { tipo: "renombrar-archivo"; nombre: string } | { tipo: "borrar-carpeta"; nombre: string } | { tipo: "borrar-archivo"; nombre: string } | null;

/** /documentos/carpetas — «Mis tareas»: una carpeta por materia, con archivos de verdad en Documentos/Nexo/Tareas. */
export function PaginaCarpetas() {
  const escritorio = useEsEscritorio();
  const disponible = escritorio === true;
  const clases = useHorarioStore((s) => s.clases);
  const [carpetas, setCarpetas] = useState<Carpeta[] | null>(null);
  const [ruta, setRuta] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<ArchivoCarpeta[]>([]);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<{ tipo: "error" | "success"; texto: string } | null>(null);
  const [crearDeHorario, setCrearDeHorario] = useState(false);
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => useHorarioStore.getState().cargar(), []);

  // Los logos de Word, Excel… tardan un momento en llegar desde Windows: se piden al entrar, para que ya estén al abrirlos.
  useEffect(() => {
    if (disponible) void cargarIconosProgramas(["word", "excel", "powerpoint", "texto", "pdf"]);
  }, [disponible]);

  const recargar = useCallback(async () => {
    try {
      setCarpetas(await listarCarpetas());
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ErrorCarpetas ? e.message : "No se pudieron leer las carpetas." });
      setCarpetas([]);
    }
  }, []);

  useEffect(() => {
    if (!disponible) return;
    void recargar();
    rutaBase().then(setRuta).catch(() => {});
  }, [disponible, recargar]);

  const cargarArchivos = useCallback(async (carpeta: string) => {
    try {
      setArchivos(await listarArchivos(carpeta));
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ErrorCarpetas ? e.message : "No se pudo leer la carpeta." });
      setAbierta(null);
    }
  }, []);

  useEffect(() => {
    if (abierta) void cargarArchivos(abierta);
  }, [abierta, cargarArchivos]);

  /** Ejecuta algo con el disco y muestra su error, si lo hay, sin romper la pantalla. */
  const intentar = async (accion: () => Promise<void>, exito?: string) => {
    try {
      await accion();
      if (exito) setAviso({ tipo: "success", texto: exito });
      else setAviso(null);
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ErrorCarpetas ? e.message : "No se pudo completar." });
    }
  };

  const agregar = async (lista: FileList | File[]) => {
    if (!abierta) return;
    const archivosNuevos = Array.from(lista);
    if (archivosNuevos.length === 0) return;
    await intentar(async () => {
      for (const f of archivosNuevos) await guardarArchivo(abierta, f);
      await cargarArchivos(abierta);
      await recargar();
    }, `${archivosNuevos.length === 1 ? "Archivo guardado" : `${archivosNuevos.length} archivos guardados`} en «${abierta}».`);
  };

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setEncima(false);
    void agregar(e.dataTransfer.files);
  };

  // Materias del horario que todavía no tienen carpeta (para ofrecer crearlas).
  const materiasSinCarpeta = useMemo(() => {
    const ya = new Set((carpetas ?? []).map((c) => c.nombre.toLowerCase()));
    return [...new Set(clases.map((c) => c.materia))].filter((m) => !ya.has(nombreCarpetaDe(m).toLowerCase()));
  }, [clases, carpetas]);
  const colorDe = (nombre: string) => clases.find((c) => nombreCarpetaDe(c.materia).toLowerCase() === nombre.toLowerCase())?.color;

  const cerrarDialogo = () => setDialogo(null);

  return (
    <>
      <PlantillaPagina
        migas={abierta ? [{ etiqueta: "Documentos", href: "/documentos" }, { etiqueta: "Mis tareas", href: "/documentos/carpetas" }, { etiqueta: abierta }] : [{ etiqueta: "Documentos", href: "/documentos" }, { etiqueta: "Mis tareas" }]}
        titulo={abierta ?? "Mis tareas"}
        descripcion={abierta ? "Los archivos de esta materia. Están en tu computadora, en una carpeta de verdad." : "Una carpeta por materia para guardar tus tareas y trabajos. Están en tu computadora, en Documentos › Nexo › Tareas."}
        accion={
          disponible && (
            <div className="flex flex-wrap justify-end gap-2">
              {abierta ? (
                <>
                  <Button onClick={() => void intentar(() => abrirEnSistema(abierta))} icon={<Glifo nombre="carpeta" />}>Abrir en el Explorador</Button>
                  <Button icon={<Glifo nombre="agregar" />} onClick={() => setDialogo({ tipo: "nuevo-archivo" })}>Nuevo archivo</Button>
                  <Button variant="accent" icon={<Glifo nombre="agregar" />} onClick={() => entrada.current?.click()}>Añadir archivos</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => void intentar(() => abrirEnSistema())} icon={<Glifo nombre="carpeta" />}>Abrir en el Explorador</Button>
                  <Button variant="accent" icon={<Glifo nombre="agregar" />} onClick={() => setDialogo({ tipo: "nueva" })}>Nueva carpeta</Button>
                </>
              )}
            </div>
          )
        }
        principal={
          escritorio === null ? null : !disponible ? (
            <InfoBar severity="info" title="Esto funciona en la aplicación de escritorio">Las carpetas de tareas son carpetas de tu computadora, así que solo están en la versión instalada de Nexo.</InfoBar>
          ) : (
            <>
              {aviso && <InfoBar severity={aviso.tipo} title={aviso.texto} onClose={() => setAviso(null)} />}

              {!abierta && materiasSinCarpeta.length > 0 && (
                <InfoBar
                  severity="info"
                  title={`Tu horario tiene ${materiasSinCarpeta.length} ${materiasSinCarpeta.length === 1 ? "materia" : "materias"} sin carpeta`}
                  action={<Button onClick={() => setCrearDeHorario(true)}>Crear carpetas</Button>}
                >
                  Puedes crearlas todas de una vez, o añadirlas a mano con «Nueva carpeta».
                </InfoBar>
              )}

              {!abierta ? (
                carpetas === null ? (
                  <p className="text-body text-fg-secondary">Cargando…</p>
                ) : carpetas.length === 0 ? (
                  <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <Glifo nombre="carpeta" tam={36} className="text-accent-text" />
                    <p className="text-subtitle text-fg">Aún no tienes carpetas</p>
                    <p className="max-w-[420px] text-body text-fg-secondary">Crea una por materia (o deja que Nexo las cree desde tu horario) y guarda ahí tus tareas.</p>
                    <Button variant="accent" onClick={() => setDialogo({ tipo: "nueva" })}>Nueva carpeta</Button>
                  </Card>
                ) : (
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3" aria-label="Carpetas">
                    {carpetas.map((c) => (
                      <li key={c.nombre}>
                        <div className="rounded-control reveal group flex items-center gap-2 border border-stroke bg-layer p-2 pl-3 shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                          <button type="button" onClick={() => setAbierta(c.nombre)} className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left" aria-label={`Abrir la carpeta ${c.nombre}, ${c.archivos} ${c.archivos === 1 ? "archivo" : "archivos"}`}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: colorDe(c.nombre) ?? "var(--accent)", color: "#fff" }} aria-hidden>
                              <Glifo nombre="carpeta" tam={18} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-body font-semibold text-fg">{c.nombre}</span>
                              <span className="block truncate text-caption text-fg-secondary">
                                {c.archivos === 0 ? "Vacía" : `${c.archivos} ${c.archivos === 1 ? "archivo" : "archivos"}`}
                                {c.ultima ? ` · ${fecha(c.ultima)}` : ""}
                              </span>
                            </span>
                          </button>
                          <BotonIcono glifo="editar" etiqueta={`Renombrar ${c.nombre}`} onClick={() => setDialogo({ tipo: "renombrar-carpeta", nombre: c.nombre })} />
                          <BotonIcono glifo="eliminar" etiqueta={`Eliminar ${c.nombre}`} peligro onClick={() => setDialogo({ tipo: "borrar-carpeta", nombre: c.nombre })} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <>
                  <div>
                    <Button variant="subtle" icon={<Glifo nombre="atras" />} onClick={() => { setAbierta(null); setAviso(null); void recargar(); }}>Todas las carpetas</Button>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
                    onDragLeave={() => setEncima(false)}
                    onDrop={alSoltar}
                    className={clsx("rounded-[8px] border-2 border-dashed px-4 py-6 text-center transition-colors duration-exit ease-fluent", encima ? "border-accent bg-layer-alt" : "border-stroke")}
                  >
                    <p className="text-body text-fg-secondary">Arrastra aquí tus archivos, o usa «Añadir archivos». Si ya existe uno con el mismo nombre, no se reemplaza: se guarda como «(2)».</p>
                  </div>
                  {archivos.length === 0 ? (
                    <p className="text-body text-fg-secondary">Esta carpeta está vacía.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5" aria-label="Archivos">
                      {archivos.map((a) => (
                        <li key={a.nombre} className="rounded-control flex items-center gap-2 border border-stroke bg-layer p-2 pl-3">
                          <button type="button" onClick={() => void intentar(() => abrirEnSistema(abierta, a.nombre))} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left" title="Abrir con su programa" aria-label={`Abrir ${a.nombre}`}>
                            {programaDeExtension(a.nombre) ? <LogoPrograma programa={programaDeExtension(a.nombre)!} tam={22} /> : <Glifo nombre="documentos" tam={18} className="text-fg-secondary" />}
                            <span className="min-w-0">
                              <span className="block truncate text-body text-fg">{a.nombre}</span>
                              <span className="block truncate text-caption text-fg-secondary">{tamano(a.bytes)} · {fecha(a.modificado)}</span>
                            </span>
                          </button>
                          <BotonIcono glifo="editar" etiqueta={`Renombrar ${a.nombre}`} onClick={() => setDialogo({ tipo: "renombrar-archivo", nombre: a.nombre })} />
                          <BotonIcono glifo="eliminar" etiqueta={`Eliminar ${a.nombre}`} peligro onClick={() => setDialogo({ tipo: "borrar-archivo", nombre: a.nombre })} />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <input ref={entrada} type="file" multiple className="hidden" onChange={(e) => { const l = e.target.files; if (l) void agregar(l); e.target.value = ""; }} />
              {ruta && <p className="text-caption text-fg-tertiary">Ubicación: {ruta}</p>}
            </>
          )
        }
      />

      {dialogo?.tipo === "nueva" && (
        <DialogoNombre titulo="Nueva carpeta" etiqueta="Nombre de la materia" inicial="" accion="Crear" onCerrar={cerrarDialogo} onGuardar={async (n) => { await crearCarpeta(n); await recargar(); }} />
      )}
      {dialogo?.tipo === "nuevo-archivo" && abierta && (
        <DialogoNuevoArchivo
          carpeta={abierta}
          ruta={ruta}
          onCerrar={cerrarDialogo}
          onCreado={async () => {
            await cargarArchivos(abierta);
            await recargar();
          }}
        />
      )}
      {dialogo?.tipo === "renombrar-carpeta" && (
        <DialogoNombre
          titulo="Renombrar carpeta"
          etiqueta="Nuevo nombre"
          inicial={dialogo.nombre}
          accion="Guardar"
          onCerrar={cerrarDialogo}
          onGuardar={async (n) => {
            const nuevo = await renombrarCarpeta(dialogo.nombre, n);
            if (abierta === dialogo.nombre) setAbierta(nuevo);
            await recargar();
          }}
        />
      )}
      {dialogo?.tipo === "renombrar-archivo" && abierta && (
        <DialogoNombre
          titulo="Renombrar archivo"
          etiqueta="Nuevo nombre"
          inicial={dialogo.nombre}
          accion="Guardar"
          onCerrar={cerrarDialogo}
          onGuardar={async (n) => {
            await renombrarArchivo(abierta, dialogo.nombre, n);
            await cargarArchivos(abierta);
          }}
        />
      )}
      {(dialogo?.tipo === "borrar-carpeta" || dialogo?.tipo === "borrar-archivo") && (
        <Dialog open onClose={cerrarDialogo} title={dialogo.tipo === "borrar-carpeta" ? "¿Eliminar la carpeta?" : "¿Eliminar el archivo?"} maxWidth={440}>
          <div className="flex flex-col gap-4">
            <p className="text-body text-fg">
              {dialogo.tipo === "borrar-carpeta"
                ? `Se elimina «${dialogo.nombre}». Solo se puede si está vacía: si tiene archivos, no se borra nada y te lo avisamos.`
                : `Se elimina «${dialogo.nombre}» de tu computadora. Esto no se puede deshacer.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={cerrarDialogo}>Cancelar</Button>
              <Button
                className="bg-[var(--error)] text-black hover:bg-[var(--error)]"
                onClick={() => {
                  const d = dialogo;
                  cerrarDialogo();
                  void intentar(async () => {
                    if (d.tipo === "borrar-carpeta") {
                      await borrarCarpeta(d.nombre);
                      await recargar();
                    } else if (abierta) {
                      await borrarArchivo(abierta, d.nombre);
                      await cargarArchivos(abierta);
                      await recargar();
                    }
                  });
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      <DialogoCarpetasHorario
        abierto={crearDeHorario}
        materias={clases.map((c) => c.materia)}
        onCerrar={() => {
          setCrearDeHorario(false);
          void recargar();
        }}
      />
    </>
  );
}
