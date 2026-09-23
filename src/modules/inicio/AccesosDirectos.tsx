"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { TextInput } from "@/components/fluent/TextInput";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { normalize } from "@/lib/text";
import { abrirAcceso } from "@/services/accesos";
import { type AppInstalada } from "@/services/apps";
import { COLORES_ACCESO, normalizarUrl, useAccesosStore, type Acceso } from "@/store/accesos-store";

/** Las iniciales del cuadro: «Word» → «W», «Google Drive» → «GD». */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

function Cuadro({ a, tam = 44 }: { a: Acceso; tam?: number }) {
  return (
    <span aria-hidden className="relative flex shrink-0 items-center justify-center rounded-[10px] font-semibold text-white" style={{ backgroundColor: a.color, width: tam, height: tam, fontSize: tam * 0.4 }}>
      {iniciales(a.nombre)}
      {a.app && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-layer text-fg shadow-card" title="Abre el programa instalado">
          <Glifo nombre="pantalla" tam={9} />
        </span>
      )}
    </span>
  );
}

/** Lista de los programas instalados, con buscador, para elegir uno. */
function ElegirPrograma({ onElegir, onVolver }: { onElegir: (a: AppInstalada) => void; onVolver: () => void }) {
  const apps = useAccesosStore((s) => s.apps);
  const buscando = useAccesosStore((s) => s.buscandoApps);
  const [texto, setTexto] = useState("");
  const visibles = useMemo(() => {
    const t = normalize(texto.trim());
    return apps.filter((a) => !t || normalize(a.nombre).includes(t)).slice(0, 80);
  }, [apps, texto]);

  return (
    <div className="flex flex-col gap-3">
      <TextInput label="Buscar en tus programas" value={texto} autoFocus autoComplete="off" placeholder="Word, Canva, Photoshop…" onChange={(e) => setTexto(e.target.value)} />
      {buscando ? (
        <p className="py-4 text-center text-body text-fg-secondary">Buscando tus programas…</p>
      ) : apps.length === 0 ? (
        <p className="py-4 text-center text-body text-fg-secondary">No pude leer tus programas. Esto solo funciona en la aplicación de escritorio de Windows.</p>
      ) : visibles.length === 0 ? (
        <p className="py-4 text-center text-body text-fg-secondary">Ningún programa se llama así.</p>
      ) : (
        <ul className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-1" aria-label="Programas instalados">
          {visibles.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onElegir(a)} className="rounded-control flex w-full items-center gap-3 border border-stroke bg-layer px-3 py-2 text-left text-body text-fg transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                <Glifo nombre="pantalla" tam={14} className="text-fg-secondary" />
                <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between gap-2">
        <Button variant="subtle" onClick={() => void useAccesosStore.getState().buscarApps(true)}>Buscar de nuevo</Button>
        <Button onClick={onVolver}>Volver</Button>
      </div>
    </div>
  );
}

/** Añadir o editar un acceso: nombre, programa instalado y/o dirección web, y color. */
function FormularioAcceso({ inicial, appInicial, onListo, onCancelar }: { inicial: Acceso | null; appInicial?: AppInstalada; onListo: () => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? appInicial?.nombre ?? "");
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [color, setColor] = useState(inicial?.color ?? COLORES_ACCESO[0]);
  const [app, setApp] = useState<AppInstalada | undefined>(inicial?.app ?? appInicial);
  const [eligiendo, setEligiendo] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string>();
  const [errorUrl, setErrorUrl] = useState<string>();
  const escritorio = useEsEscritorio() === true;

  if (eligiendo) return <ElegirPrograma onElegir={(a) => { setApp(a); if (!nombre.trim()) setNombre(a.nombre); setEligiendo(false); }} onVolver={() => setEligiendo(false)} />;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setErrorNombre("Escribe un nombre.");
    const normal = url.trim() ? normalizarUrl(url) : "";
    if (normal === null) return setErrorUrl("Esa dirección no es válida. Por ejemplo: canva.com");
    if (!normal && !app) return setErrorUrl("Escribe una dirección web o elige un programa.");
    useAccesosStore.getState().guardar({
      id: inicial?.id,
      nombre: nombre.trim().slice(0, 40),
      url: normal,
      color,
      ...(app ? { app } : {}),
      // Si quitó el programa a propósito, se recuerda: la búsqueda automática no se lo vuelve a poner.
      ...(!app && (inicial?.app || inicial?.web) ? { web: true } : {}),
    });
    onListo();
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <TextInput label="Nombre" value={nombre} maxLength={40} autoFocus autoComplete="off" placeholder="Canva" error={errorNombre} onChange={(e) => { setNombre(e.target.value); setErrorNombre(undefined); }} />

      {escritorio && (
        <div>
          <span className="mb-1.5 block text-caption text-fg-secondary">Programa de tu computadora</span>
          <div className="flex items-center gap-2">
            <span className="rounded-input flex h-8 min-w-0 flex-1 items-center gap-2 border border-stroke bg-layer-alt px-3 text-body">
              <Glifo nombre="pantalla" tam={14} className="shrink-0 text-fg-secondary" />
              <span className={clsx("truncate", app ? "text-fg" : "text-fg-tertiary")}>{app ? app.nombre : "Ninguno: se abrirá el navegador"}</span>
            </span>
            <Button type="button" onClick={() => setEligiendo(true)}>{app ? "Cambiar" : "Elegir"}</Button>
            {app && <Button type="button" variant="subtle" onClick={() => setApp(undefined)}>Quitar</Button>}
          </div>
        </div>
      )}

      <TextInput label={app ? "Dirección web (si el programa no abre)" : "Dirección web"} value={url} autoComplete="off" placeholder="canva.com" inputMode="url" error={errorUrl} hint="Solo direcciones web (http o https)." onChange={(e) => { setUrl(e.target.value); setErrorUrl(undefined); }} />

      <fieldset>
        <legend className="mb-1.5 text-caption text-fg-secondary">Color</legend>
        <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
          {COLORES_ACCESO.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className={clsx("flex h-8 w-8 items-center justify-center rounded-full border-2", color === c ? "border-fg" : "border-transparent")} style={{ backgroundColor: c }}>
              {color === c && <Glifo nombre="exito" tam={12} className="text-white" />}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="accent">Guardar</Button>
      </div>
    </form>
  );
}

type Vista = { t: "lista" } | { t: "form"; acceso: Acceso | null; app?: AppInstalada } | { t: "programas" };

function DialogoAccesos({ onCerrar }: { onCerrar: () => void }) {
  const accesos = useAccesosStore((s) => s.accesos);
  const buscando = useAccesosStore((s) => s.buscandoApps);
  const [vista, setVista] = useState<Vista>({ t: "lista" });
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const escritorio = useEsEscritorio() === true;
  const conPrograma = accesos.filter((a) => a.app).length;

  const titulo = vista.t === "lista" ? "Accesos directos" : vista.t === "programas" ? "Añadir desde tus programas" : vista.acceso ? "Editar acceso" : "Nuevo acceso";
  const volver = () => setVista({ t: "lista" });

  return (
    <Dialog open onClose={onCerrar} title={titulo} maxWidth={520}>
      {vista.t === "form" ? (
        <FormularioAcceso inicial={vista.acceso} appInicial={vista.app} onListo={volver} onCancelar={volver} />
      ) : vista.t === "programas" ? (
        <ElegirPrograma onElegir={(a) => setVista({ t: "form", acceso: null, app: a })} onVolver={volver} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">
            {escritorio ? "Si el programa está instalado en tu computadora, se abre ese; si no, se abre la página web en tu navegador." : "Se abren en tu navegador."} Quita los que no uses y añade los tuyos.
          </p>
          {escritorio && (
            <p className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
              {buscando ? "Buscando tus programas…" : `${conPrograma} de ${accesos.length} se abren con su programa instalado.`}
              <button type="button" onClick={() => void useAccesosStore.getState().buscarApps(true)} className="text-accent-text hover:underline">Buscar de nuevo</button>
            </p>
          )}
          {accesos.length === 0 ? (
            <p className="rounded-control border border-stroke bg-layer px-3 py-4 text-center text-body text-fg-secondary">No hay accesos. Añade uno, o restaura los de siempre.</p>
          ) : (
            <ul className="flex max-h-[300px] flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Accesos">
              {accesos.map((a) => (
                <li key={a.id} className="rounded-control flex items-center gap-3 border border-stroke bg-layer p-2">
                  <Cuadro a={a} tam={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-fg">{a.nombre}</span>
                    <span className="block truncate text-caption text-fg-tertiary">{a.app ? `Programa: ${a.app.nombre}` : a.url}</span>
                  </span>
                  <button type="button" onClick={() => setVista({ t: "form", acceso: a })} aria-label={`Editar ${a.nombre}`} title="Editar" className="rounded-control flex h-8 w-8 items-center justify-center text-fg-secondary hover:bg-layer-alt hover:text-fg">
                    <Glifo nombre="editar" tam={14} />
                  </button>
                  <button type="button" onClick={() => useAccesosStore.getState().quitar(a.id)} aria-label={`Quitar ${a.nombre}`} title="Quitar" className="rounded-control flex h-8 w-8 items-center justify-center text-fg-secondary hover:bg-layer-alt hover:text-danger">
                    <Glifo nombre="eliminar" tam={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {confirmarRestaurar ? (
              <span className="flex items-center gap-2">
                <span className="text-caption text-fg-secondary">¿Volver a los de siempre? Se pierden los tuyos.</span>
                <Button className="h-7" onClick={() => { useAccesosStore.getState().restaurar(); setConfirmarRestaurar(false); void useAccesosStore.getState().buscarApps(); }}>Sí</Button>
                <Button variant="subtle" className="h-7" onClick={() => setConfirmarRestaurar(false)}>No</Button>
              </span>
            ) : (
              <Button variant="subtle" onClick={() => setConfirmarRestaurar(true)}>Restaurar los de siempre</Button>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCerrar}>Cerrar</Button>
              {escritorio && <Button onClick={() => setVista({ t: "programas" })}>Desde mis programas</Button>}
              <Button variant="accent" icon={<Glifo nombre="agregar" />} onClick={() => setVista({ t: "form", acceso: null })}>Añadir</Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** Accesos directos a las herramientas de siempre (Word, Excel, Canva, Drive…): abren el programa instalado, o la web. */
export function AccesosDirectos() {
  const accesos = useAccesosStore((s) => s.accesos);
  const [gestion, setGestion] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    useAccesosStore.getState().cargar();
    void useAccesosStore.getState().buscarApps(); // en segundo plano: al terminar, cada acceso pasa a abrir su programa
  }, []);

  const abrir = async (a: Acceso) => {
    setProblema(null);
    if (!(await abrirAcceso(a))) setProblema(`«${a.nombre}» no tiene programa ni dirección. Pulsa «Editar» para arreglarlo.`);
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-body font-semibold text-fg">Accesos directos</h2>
        <Button variant="subtle" className="h-7" icon={<Glifo nombre="editar" tam={12} />} onClick={() => setGestion(true)}>
          Editar
        </Button>
      </div>
      {accesos.length === 0 ? (
        <p className="text-body text-fg-secondary">Aún no tienes accesos. Pulsa «Editar» para añadir Word, Canva o lo que uses.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2" aria-label="Accesos directos">
          {accesos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => void abrir(a)}
                title={a.app ? `Abre ${a.app.nombre} (instalado en tu computadora)` : a.url}
                aria-label={`Abrir ${a.nombre}${a.app ? " (programa instalado)" : ""}`}
                className="rounded-control reveal flex w-full flex-col items-center gap-1.5 px-1 py-2.5 text-center transition-colors duration-exit ease-fluent hover:bg-layer-alt"
              >
                <Cuadro a={a} />
                <span className="line-clamp-2 w-full text-caption leading-tight text-fg">{a.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {problema && <p className="mt-2 text-caption text-danger" role="alert">{problema}</p>}
      {gestion && <DialogoAccesos onCerrar={() => setGestion(false)} />}
    </Card>
  );
}
