"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Selector } from "@/components/fluent/Selector";
import { Switch } from "@/components/fluent/Switch";
import { TextInput } from "@/components/fluent/TextInput";
import { CATEGORIAS, infoCategoria, type CategoriaEvento } from "@/lib/calendario/categorias";
import { claveFecha, diasEnMes, nombreMes, type Repeticion } from "@/lib/calendario/fechas";
import { COLORES_AMIGO, useCalendarioStore, type Evento } from "@/store/calendario-store";

export type BorradorEvento = Partial<Evento> & { dia: number; mes: number; anio: number };

const CAMPO = "h-8 w-full rounded-input border border-stroke bg-layer-alt px-2 text-body text-fg transition-colors duration-exit ease-fluent hover:bg-layer focus-visible:outline-none focus-visible:border-accent";

/**
 * Añadir o editar algo del calendario: primero se elige qué es (tarea, examen, cita, recordatorio, otro…)
 * y eso lo marca con su nombre y color. «Cumpleaños» pasa a su propio formulario (`onCumple`).
 */
export function DialogoEvento({ abierto, inicial, onCerrar, onCumple }: { abierto: boolean; inicial: BorradorEvento | null; onCerrar: () => void; onCumple?: (dia: number, mes: number, nombre: string) => void }) {
  const t = useT();
  const idHora = useId();
  const idNota = useId();
  const campoTitulo = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEvento>("tarea");
  /** Si el usuario ya eligió un color a mano, cambiar de categoría no se lo pisa. */
  const [colorManual, setColorManual] = useState(false);
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

  const editando = !!inicial?.id;

  useEffect(() => {
    if (!abierto || !inicial) return;
    setTitulo(inicial.titulo ?? "");
    setCategoria(inicial.categoria ?? "tarea");
    setColorManual(!!inicial.id);
    setDia(inicial.dia);
    setMes(inicial.mes);
    setAnio(inicial.anio);
    setHora(inicial.hora ?? "");
    setRepetir(inicial.repetir ?? "no");
    setColor(inicial.color ?? infoCategoria(inicial.categoria ?? "tarea").color);
    setNota(inicial.nota ?? "");
    setAvisar(inicial.avisar ?? true);
    setErrorTitulo(undefined);
    setConfirmarBorrado(false);
    const espera = setTimeout(() => campoTitulo.current?.focus(), 120);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [abierto, inicial]);

  const maxDia = diasEnMes(anio, mes);
  useEffect(() => {
    if (dia > maxDia) setDia(maxDia);
  }, [dia, maxDia]);

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorTitulo(t("Escribe de qué se trata."));
      return;
    }
    const fecha = claveFecha(new Date(anio, mes - 1, dia));
    useCalendarioStore.getState().guardarEvento({ id: inicial?.id, titulo: titulo.trim(), categoria, fecha, hora: hora || null, color, nota: nota.trim(), avisar, repetir });
    onCerrar();
  };

  const elegirCategoria = (c: CategoriaEvento) => {
    setCategoria(c);
    if (!colorManual) setColor(infoCategoria(c).color);
  };

  const borrar = () => {
    if (inicial?.id) useCalendarioStore.getState().quitarEvento(inicial.id);
    onCerrar();
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} title={editando ? t("Editar") : t("Añadir al calendario")} maxWidth={480}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-caption text-fg-secondary">{t("¿Qué es?")}</legend>
          <div role="radiogroup" aria-label={t("Tipo")} className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => {
              const activa = categoria === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  onClick={() => elegirCategoria(c.id)}
                  className={clsx("rounded-control inline-flex h-8 items-center gap-2 border px-3 text-body transition-colors duration-exit ease-fluent", activa ? "border-accent bg-layer-alt text-fg" : "border-stroke bg-layer text-fg-secondary hover:bg-layer-alt")}
                >
                  <span style={{ color: c.color }}>
                    <Glifo nombre={c.glifo} tam={14} />
                  </span>
                  {t(c.nombre)}
                </button>
              );
            })}
            {!editando && onCumple && (
              <button
                type="button"
                onClick={() => {
                  onCerrar();
                  onCumple(dia, mes, titulo.trim());
                }}
                className="rounded-control inline-flex h-8 items-center gap-2 border border-stroke bg-layer px-3 text-body text-fg-secondary transition-colors duration-exit ease-fluent hover:bg-layer-alt"
              >
                <span style={{ color: "#e5509f" }}>
                  <Glifo nombre="regalo" tam={14} />
                </span>
                {t("Cumpleaños")}
              </button>
            )}
          </div>
        </fieldset>

        <TextInput ref={campoTitulo} label={t("Título")} value={titulo} maxLength={60} autoComplete="off" placeholder={t("Por ejemplo, {ejemplo}", { ejemplo: t(infoCategoria(categoria).ejemplo) })} error={errorTitulo} onChange={(e) => { setTitulo(e.target.value); setErrorTitulo(undefined); }} />

        <div className="grid grid-cols-[80px_1fr_90px] gap-3">
          <div>
            <label htmlFor="evento-dia" className="mb-1.5 block text-caption text-fg-secondary">{repetir === "no" ? t("Día") : t("Empieza el")}</label>
            <Selector id="evento-dia" label={t("Día")} value={dia} onChange={setDia} options={Array.from({ length: maxDia }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />
          </div>
          <div>
            <label htmlFor="evento-mes" className="mb-1.5 block text-caption text-fg-secondary">{t("Mes")}</label>
            <Selector id="evento-mes" label={t("Mes")} value={mes} onChange={setMes} className="capitalize" options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: nombreMes(i) }))} />
          </div>
          <div>
            <label htmlFor="evento-anio" className="mb-1.5 block text-caption text-fg-secondary">{t("Año")}</label>
            <input id="evento-anio" inputMode="numeric" value={anio} maxLength={4} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v) setAnio(Number(v)); }} className={CAMPO} />
          </div>
        </div>

        <div>
          <label htmlFor={idHora} className="mb-1.5 block text-caption text-fg-secondary">{t("Hora (opcional)")}</label>
          <input id={idHora} type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={clsx(CAMPO, "w-[140px]")} />
        </div>

        <div>
          <span className="mb-1.5 block text-caption text-fg-secondary">{t("Repetir")}</span>
          <SegmentedControl<Repeticion>
            label={t("Repetir")}
            etiquetaVisible={false}
            value={repetir}
            options={[
              { value: "no", label: t("Nunca") },
              { value: "semanal", label: t("Cada semana") },
              { value: "mensual", label: t("Cada mes") },
            ]}
            onChange={setRepetir}
          />
          {repetir === "mensual" && dia > 28 && (
            <p className="mt-1.5 text-caption text-fg-tertiary">{t("En los meses más cortos se marcará el último día del mes.")}</p>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-caption text-fg-secondary">{t("Color en el calendario")}</legend>
          <div role="radiogroup" aria-label={t("Color en el calendario")} className="flex flex-wrap gap-2">
            {COLORES_AMIGO.map((c) => (
              <button
                key={c.valor}
                type="button"
                role="radio"
                aria-checked={color === c.valor}
                aria-label={t(c.nombre)}
                title={t(c.nombre)}
                onClick={() => {
                  setColor(c.valor);
                  setColorManual(true);
                }}
                className={clsx("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform duration-exit ease-fluent hover:scale-110", color === c.valor ? "border-fg" : "border-transparent")}
                style={{ backgroundColor: c.valor }}
              >
                {color === c.valor && <Glifo nombre="exito" tam={12} className="text-white" />}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={idNota} className="mb-1.5 block text-caption text-fg-secondary">{t("Nota (opcional)")}</label>
          <input id={idNota} value={nota} maxLength={200} placeholder={t("Detalles…")} onChange={(e) => setNota(e.target.value)} className={CAMPO} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-body text-fg">{t("Avisarme de este evento")}</span>
          <Switch checked={avisar} onChange={setAvisar} label={t("Avisarme de este evento")} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {editando ? (
            confirmarBorrado ? (
              <span className="flex items-center gap-2">
                <span className="text-caption text-fg-secondary">{t("¿Eliminar «{titulo}»?", { titulo: inicial?.titulo ?? "" })}</span>
                <Button type="button" onClick={borrar} className="h-7 bg-[var(--error)] text-black hover:bg-[var(--error)]">{t("Sí, eliminar")}</Button>
                <Button type="button" variant="subtle" className="h-7" onClick={() => setConfirmarBorrado(false)}>{t("No")}</Button>
              </span>
            ) : (
              <Button type="button" variant="subtle" onClick={() => setConfirmarBorrado(true)}>{t("Eliminar")}</Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={onCerrar}>{t("Cancelar")}</Button>
            <Button type="submit" variant="accent">{t("Guardar")}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
