"use client";

import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { TextInput } from "@/components/fluent/TextInput";
import { abrirExterno } from "@/lib/entorno";
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
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-[10px] font-semibold text-white" style={{ backgroundColor: a.color, width: tam, height: tam, fontSize: tam * 0.4 }}>
      {iniciales(a.nombre)}
    </span>
  );
}

/** Añadir o editar un acceso: nombre, dirección y color. La dirección se completa sola («canva.com» → https://canva.com). */
function FormularioAcceso({ inicial, onListo, onCancelar }: { inicial: Acceso | null; onListo: () => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [color, setColor] = useState(inicial?.color ?? COLORES_ACCESO[0]);
  const [errorNombre, setErrorNombre] = useState<string>();
  const [errorUrl, setErrorUrl] = useState<string>();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const normal = normalizarUrl(url);
    if (!nombre.trim()) return setErrorNombre("Escribe un nombre.");
    if (!normal) return setErrorUrl("Escribe una dirección web, por ejemplo canva.com");
    useAccesosStore.getState().guardar({ id: inicial?.id, nombre: nombre.trim().slice(0, 40), url: normal, color });
    onListo();
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <TextInput label="Nombre" value={nombre} maxLength={40} autoFocus autoComplete="off" placeholder="Canva" error={errorNombre} onChange={(e) => { setNombre(e.target.value); setErrorNombre(undefined); }} />
      <TextInput label="Dirección" value={url} autoComplete="off" placeholder="canva.com" inputMode="url" error={errorUrl} hint="Solo direcciones web (http o https)." onChange={(e) => { setUrl(e.target.value); setErrorUrl(undefined); }} />
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

function DialogoAccesos({ onCerrar }: { onCerrar: () => void }) {
  const accesos = useAccesosStore((s) => s.accesos);
  const [editando, setEditando] = useState<Acceso | "nuevo" | null>(null);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);

  return (
    <Dialog open onClose={onCerrar} title={editando === null ? "Accesos directos" : editando === "nuevo" ? "Nuevo acceso" : "Editar acceso"} maxWidth={500}>
      {editando !== null ? (
        <FormularioAcceso inicial={editando === "nuevo" ? null : editando} onListo={() => setEditando(null)} onCancelar={() => setEditando(null)} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">Se abren en tu navegador. Quita los que no uses y añade los tuyos.</p>
          {accesos.length === 0 ? (
            <p className="rounded-control border border-stroke bg-layer px-3 py-4 text-center text-body text-fg-secondary">No hay accesos. Añade uno, o restaura los de siempre.</p>
          ) : (
            <ul className="flex max-h-[300px] flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Accesos">
              {accesos.map((a) => (
                <li key={a.id} className="rounded-control flex items-center gap-3 border border-stroke bg-layer p-2">
                  <Cuadro a={a} tam={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-fg">{a.nombre}</span>
                    <span className="block truncate text-caption text-fg-tertiary">{a.url}</span>
                  </span>
                  <button type="button" onClick={() => setEditando(a)} aria-label={`Editar ${a.nombre}`} title="Editar" className="rounded-control flex h-8 w-8 items-center justify-center text-fg-secondary hover:bg-layer-alt hover:text-fg">
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
                <Button className="h-7" onClick={() => { useAccesosStore.getState().restaurar(); setConfirmarRestaurar(false); }}>Sí</Button>
                <Button variant="subtle" className="h-7" onClick={() => setConfirmarRestaurar(false)}>No</Button>
              </span>
            ) : (
              <Button variant="subtle" onClick={() => setConfirmarRestaurar(true)}>Restaurar los de siempre</Button>
            )}
            <div className="flex gap-2">
              <Button onClick={onCerrar}>Cerrar</Button>
              <Button variant="accent" icon={<Glifo nombre="agregar" />} onClick={() => setEditando("nuevo")}>Añadir</Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** Accesos directos a las herramientas de siempre (Word, Excel, Canva, Drive…) en un clic desde Inicio. */
export function AccesosDirectos() {
  const accesos = useAccesosStore((s) => s.accesos);
  const [gestion, setGestion] = useState(false);

  useEffect(() => useAccesosStore.getState().cargar(), []);

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
                onClick={() => void abrirExterno(a.url)}
                title={a.url}
                aria-label={`Abrir ${a.nombre}`}
                className="rounded-control reveal flex w-full flex-col items-center gap-1.5 px-1 py-2.5 text-center transition-colors duration-exit ease-fluent hover:bg-layer-alt"
              >
                <Cuadro a={a} />
                <span className="line-clamp-2 w-full text-caption leading-tight text-fg">{a.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {gestion && <DialogoAccesos onCerrar={() => setGestion(false)} />}
    </Card>
  );
}
