"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Selector } from "@/components/fluent/Selector";
import { Switch } from "@/components/fluent/Switch";
import { TextInput } from "@/components/fluent/TextInput";
import { claveFecha, diasEnMes, MESES, type Repeticion } from "@/lib/calendario/fechas";
import { COLORES_AMIGO, useCalendarioStore, type Evento } from "@/store/calendario-store";

export type BorradorEvento = Partial<Evento> & { dia: number; mes: number; anio: number };

const CAMPO = "h-8 w-full rounded-input border border-stroke bg-layer-alt px-2 text-body text-fg transition-colors duration-exit ease-fluent hover:bg-layer focus-visible:outline-none focus-visible:border-accent";

/** Añadir o editar un evento general (cita, recordatorio…): una fecha concreta, con hora opcional. */
export function DialogoEvento({ abierto, inicial, onCerrar }: { abierto: boolean; inicial: BorradorEvento | null; onCerrar: () => void }) {
  const idHora = useId();
  const idNota = useId();
  const campoTitulo = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState(1);
  const [mes, setMes] = useState(1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [hora, setHora] = useState("");
  const [repetir, setRepetir] = useState<Repeticion>("no");
  const [color, setColor] = useState(COLORES_AMIGO[0]!.valor);
  const [nota, setNota] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [errorTitulo, setErrorTitulo] = useState<string>();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const eventos = useCalendarioStore((s) => s.eventos);

  const editando = !!inicial?.id;

  useEffect(() => {
    if (!abierto || !inicial) return;
    setTitulo(inicial.titulo ?? "");
    setDia(inicial.dia);
    setMes(inicial.mes);
    setAnio(inicial.anio);
    setHora(inicial.hora ?? "");
    setRepetir(inicial.repetir ?? "no");
    setColor(inicial.color ?? COLORES_AMIGO[eventos.length % COLORES_AMIGO.length]!.valor);
    setNota(inicial.nota ?? "");
    setAvisar(inicial.avisar ?? true);
    setErrorTitulo(undefined);
    setConfirmarBorrado(false);
    const t = setTimeout(() => campoTitulo.current?.focus(), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [abierto, inicial]);

  const maxDia = diasEnMes(anio, mes);
  useEffect(() => {
    if (dia > maxDia) setDia(maxDia);
  }, [dia, maxDia]);

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorTitulo("Escribe de qué se trata.");
      return;
    }
    const fecha = claveFecha(new Date(anio, mes - 1, dia));
    useCalendarioStore.getState().guardarEvento({ id: inicial?.id, titulo: titulo.trim(), fecha, hora: hora || null, color, nota: nota.trim(), avisar, repetir });
    onCerrar();
  };

  const borrar = () => {
    if (inicial?.id) useCalendarioStore.getState().quitarEvento(inicial.id);
    onCerrar();
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} title={editando ? "Editar evento" : "Añadir evento"} maxWidth={480}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <TextInput ref={campoTitulo} label="¿Qué es?" value={titulo} maxLength={60} autoComplete="off" placeholder="Por ejemplo, Cita con el dentista" error={errorTitulo} onChange={(e) => { setTitulo(e.target.value); setErrorTitulo(undefined); }} />

        <div className="grid grid-cols-[80px_1fr_90px] gap-3">
          <div>
            <label htmlFor="evento-dia" className="mb-1.5 block text-caption text-fg-secondary">{repetir === "no" ? "Día" : "Empieza el"}</label>
            <Selector id="evento-dia" label="Día" value={dia} onChange={setDia} options={Array.from({ length: maxDia }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />
          </div>
          <div>
            <label htmlFor="evento-mes" className="mb-1.5 block text-caption text-fg-secondary">Mes</label>
            <Selector id="evento-mes" label="Mes" value={mes} onChange={setMes} className="capitalize" options={MESES.map((m, i) => ({ value: i + 1, label: m }))} />
          </div>
          <div>
            <label htmlFor="evento-anio" className="mb-1.5 block text-caption text-fg-secondary">Año</label>
            <input id="evento-anio" inputMode="numeric" value={anio} maxLength={4} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v) setAnio(Number(v)); }} className={CAMPO} />
          </div>
        </div>

        <div>
          <label htmlFor={idHora} className="mb-1.5 block text-caption text-fg-secondary">Hora (opcional)</label>
          <input id={idHora} type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={clsx(CAMPO, "w-[140px]")} />
        </div>

        <div>
          <span className="mb-1.5 block text-caption text-fg-secondary">Repetir</span>
          <SegmentedControl<Repeticion>
            label="Repetir"
            etiquetaVisible={false}
            value={repetir}
            options={[
              { value: "no", label: "Nunca" },
              { value: "semanal", label: "Cada semana" },
              { value: "mensual", label: "Cada mes" },
            ]}
            onChange={setRepetir}
          />
          {repetir === "mensual" && dia > 28 && (
            <p className="mt-1.5 text-caption text-fg-tertiary">En los meses más cortos se marcará el último día del mes.</p>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-caption text-fg-secondary">Color en el calendario</legend>
          <div role="radiogroup" aria-label="Color en el calendario" className="flex flex-wrap gap-2">
            {COLORES_AMIGO.map((c) => (
              <button
                key={c.valor}
                type="button"
                role="radio"
                aria-checked={color === c.valor}
                aria-label={c.nombre}
                title={c.nombre}
                onClick={() => setColor(c.valor)}
                className={clsx("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform duration-exit ease-fluent hover:scale-110", color === c.valor ? "border-fg" : "border-transparent")}
                style={{ backgroundColor: c.valor }}
              >
                {color === c.valor && <Glifo nombre="exito" tam={12} className="text-white" />}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={idNota} className="mb-1.5 block text-caption text-fg-secondary">Nota (opcional)</label>
          <input id={idNota} value={nota} maxLength={200} placeholder="Detalles…" onChange={(e) => setNota(e.target.value)} className={CAMPO} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-body text-fg">Avisarme de este evento</span>
          <Switch checked={avisar} onChange={setAvisar} label="Avisarme de este evento" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {editando ? (
            confirmarBorrado ? (
              <span className="flex items-center gap-2">
                <span className="text-caption text-fg-secondary">¿Eliminar «{inicial?.titulo}»?</span>
                <Button type="button" onClick={borrar} className="h-7 bg-[var(--error)] text-black hover:bg-[var(--error)]">Sí, eliminar</Button>
                <Button type="button" variant="subtle" className="h-7" onClick={() => setConfirmarBorrado(false)}>No</Button>
              </span>
            ) : (
              <Button type="button" variant="subtle" onClick={() => setConfirmarBorrado(true)}>Eliminar</Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={onCerrar}>Cancelar</Button>
            <Button type="submit" variant="accent">Guardar</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
