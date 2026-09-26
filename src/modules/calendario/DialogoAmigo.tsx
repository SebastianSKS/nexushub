"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { Selector } from "@/components/fluent/Selector";
import { Switch } from "@/components/fluent/Switch";
import { TextInput } from "@/components/fluent/TextInput";
import { diasEnMes, nombreMes } from "@/lib/calendario/fechas";
import { COLORES_AMIGO, useCalendarioStore, type Amigo } from "@/store/calendario-store";

export type BorradorAmigo = Partial<Amigo> & { dia: number; mes: number };

const CAMPO = "h-8 w-full rounded-input border border-stroke bg-layer-alt px-2 text-body text-fg transition-colors duration-exit ease-fluent hover:bg-layer focus-visible:outline-none focus-visible:border-accent";

/** Añadir o editar el cumpleaños de un amigo: nombre, fecha, color, nota y si quieres que te avise. */
export function DialogoAmigo({ abierto, inicial, onCerrar }: { abierto: boolean; inicial: BorradorAmigo | null; onCerrar: () => void }) {
  const t = useT();
  const idDia = useId();
  const idMes = useId();
  const idAnio = useId();
  const idNota = useId();
  const campoNombre = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [dia, setDia] = useState(1);
  const [mes, setMes] = useState(1);
  const [anio, setAnio] = useState("");
  const [color, setColor] = useState(COLORES_AMIGO[0]!.valor);
  const [nota, setNota] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [errores, setErrores] = useState<{ nombre?: string; anio?: string }>({});
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const amigos = useCalendarioStore((s) => s.amigos);

  const editando = !!inicial?.id;

  useEffect(() => {
    if (!abierto || !inicial) return;
    setNombre(inicial.nombre ?? "");
    setDia(inicial.dia);
    setMes(inicial.mes);
    setAnio(inicial.anio ? String(inicial.anio) : "");
    // Un amigo nuevo estrena el siguiente color libre: así el calendario se ve variado desde el principio.
    setColor(inicial.color ?? COLORES_AMIGO[amigos.length % COLORES_AMIGO.length]!.valor);
    setNota(inicial.nota ?? "");
    setAvisar(inicial.avisar ?? true);
    setErrores({});
    setConfirmarBorrado(false);
    const espera = setTimeout(() => campoNombre.current?.focus(), 120);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [abierto, inicial]);

  const maxDia = diasEnMes(2000, mes); // el 29 de febrero es válido
  useEffect(() => {
    if (dia > maxDia) setDia(maxDia);
  }, [dia, maxDia]);

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (!nombre.trim()) nuevos.nombre = t("Escribe el nombre de tu amigo.");
    const anioNum = anio.trim() ? Number(anio) : null;
    if (anioNum !== null && (!Number.isInteger(anioNum) || anioNum < 1900 || anioNum > new Date().getFullYear())) nuevos.anio = t("Escribe un año entre 1900 y {actual}, o déjalo vacío.", { actual: new Date().getFullYear() });
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    useCalendarioStore.getState().guardarAmigo({ id: inicial?.id, nombre: nombre.trim(), dia, mes, anio: anioNum, color, nota: nota.trim(), avisar });
    onCerrar();
  };

  const borrar = () => {
    if (inicial?.id) useCalendarioStore.getState().quitarAmigo(inicial.id);
    onCerrar();
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} title={editando ? t("Editar cumpleaños") : t("Añadir cumpleaños")} maxWidth={480}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <TextInput ref={campoNombre} label={t("Nombre del amigo")} value={nombre} maxLength={40} autoComplete="off" placeholder={t("Por ejemplo, Ana")} error={errores.nombre} onChange={(e) => { setNombre(e.target.value); setErrores((x) => ({ ...x, nombre: undefined })); }} />

        <div className="grid grid-cols-[88px_1fr_110px] gap-3">
          <div>
            <label htmlFor={idDia} className="mb-1.5 block text-caption text-fg-secondary">{t("Día")}</label>
            <Selector id={idDia} label={t("Día")} value={dia} onChange={setDia} options={Array.from({ length: maxDia }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />
          </div>
          <div>
            <label htmlFor={idMes} className="mb-1.5 block text-caption text-fg-secondary">{t("Mes")}</label>
            <Selector id={idMes} label={t("Mes")} value={mes} onChange={setMes} className="capitalize" options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: nombreMes(i) }))} />
          </div>
          <div>
            <label htmlFor={idAnio} className="mb-1.5 block text-caption text-fg-secondary">{t("Año (opcional)")}</label>
            <input id={idAnio} inputMode="numeric" value={anio} maxLength={4} placeholder="2000" aria-invalid={errores.anio ? true : undefined} onChange={(e) => { setAnio(e.target.value.replace(/\D/g, "")); setErrores((x) => ({ ...x, anio: undefined })); }} className={CAMPO} />
          </div>
        </div>
        {errores.anio && <p className="-mt-2 text-caption text-danger-fg">{errores.anio}</p>}
        {mes === 2 && dia === 29 && <p className="-mt-2 text-caption text-fg-tertiary">{t("En los años que no son bisiestos se marcará el 28 de febrero.")}</p>}

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
          <label htmlFor={idNota} className="mb-1.5 block text-caption text-fg-secondary">{t("Nota (opcional)")}</label>
          <input id={idNota} value={nota} maxLength={200} placeholder={t("Idea de regalo, cómo lo conociste…")} onChange={(e) => setNota(e.target.value)} className={CAMPO} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-body text-fg">{t("Avisarme de este cumpleaños")}</span>
          <Switch checked={avisar} onChange={setAvisar} label={t("Avisarme de este cumpleaños")} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {editando ? (
            confirmarBorrado ? (
              <span className="flex items-center gap-2">
                <span className="text-caption text-fg-secondary">{t("¿Eliminar a {nombre}?", { nombre: inicial?.nombre ?? "" })}</span>
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
