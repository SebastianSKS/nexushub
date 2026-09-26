"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { Selector } from "@/components/fluent/Selector";
import { TextInput } from "@/components/fluent/TextInput";
import { PATRON_HORA, aMinutos, nombreDiaSemana, type Clase } from "@/lib/horario/horario";
import { COLORES_AMIGO } from "@/store/calendario-store";
import { useHorarioStore } from "@/store/horario-store";

export type BorradorClase = Partial<Clase> & { dia: number };

const CAMPO = "h-8 w-full rounded-input border border-stroke bg-layer-alt px-2 text-body text-fg transition-colors duration-exit ease-fluent hover:bg-layer focus-visible:outline-none focus-visible:border-accent";

/** Añadir o editar una clase del horario semanal. */
export function DialogoClase({ abierto, inicial, onCerrar }: { abierto: boolean; inicial: BorradorClase | null; onCerrar: () => void }) {
  const t = useT();
  const idIni = useId();
  const idFin = useId();
  const campoMateria = useRef<HTMLInputElement>(null);
  const [materia, setMateria] = useState("");
  const [codigo, setCodigo] = useState("");
  const [docente, setDocente] = useState("");
  const [aula, setAula] = useState("");
  const [dia, setDia] = useState(0);
  const [inicio, setInicio] = useState("07:00");
  const [fin, setFin] = useState("08:00");
  const [color, setColor] = useState(COLORES_AMIGO[0]!.valor);
  const [error, setError] = useState<string>();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const editando = !!inicial?.id;

  useEffect(() => {
    if (!abierto || !inicial) return;
    setMateria(inicial.materia ?? "");
    setCodigo(inicial.codigo ?? "");
    setDocente(inicial.docente ?? "");
    setAula(inicial.aula ?? "");
    setDia(inicial.dia);
    setInicio(inicial.inicio ?? "07:00");
    setFin(inicial.fin ?? "08:00");
    setColor(inicial.color ?? COLORES_AMIGO[0]!.valor);
    setError(undefined);
    setConfirmarBorrado(false);
    const espera = setTimeout(() => campoMateria.current?.focus(), 120);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [abierto, inicial]);

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    if (!materia.trim()) return setError(t("Escribe el nombre de la materia."));
    if (!PATRON_HORA.test(inicio) || !PATRON_HORA.test(fin)) return setError(t("Elige la hora de inicio y la de fin."));
    if (aMinutos(fin) <= aMinutos(inicio)) return setError(t("La clase debe terminar después de empezar."));
    useHorarioStore.getState().guardarClase({ id: inicial?.id, materia: materia.trim(), codigo: codigo.trim(), docente: docente.trim(), aula: aula.trim(), dia, inicio, fin, color });
    onCerrar();
  };

  const borrar = () => {
    if (inicial?.id) useHorarioStore.getState().quitarClase(inicial.id);
    onCerrar();
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} title={editando ? t("Editar clase") : t("Añadir clase")} maxWidth={480}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <TextInput ref={campoMateria} label={t("Materia")} value={materia} maxLength={60} autoComplete="off" placeholder={t("Por ejemplo, Redes de computadoras")} error={error && !materia.trim() ? error : undefined} onChange={(e) => { setMateria(e.target.value); setError(undefined); }} />

        <div className="grid grid-cols-2 gap-3">
          <TextInput label={t("Clave (opcional)")} value={codigo} maxLength={20} autoComplete="off" placeholder="SDC-1021" onChange={(e) => setCodigo(e.target.value)} />
          <TextInput label={t("Aula (opcional)")} value={aula} maxLength={20} autoComplete="off" placeholder="14A" onChange={(e) => setAula(e.target.value)} />
        </div>

        <TextInput label={t("Docente (opcional)")} value={docente} maxLength={60} autoComplete="off" onChange={(e) => setDocente(e.target.value)} />

        <div className="grid grid-cols-[1fr_130px_130px] gap-3">
          <div>
            <label htmlFor="clase-dia" className="mb-1.5 block text-caption text-fg-secondary">{t("Día")}</label>
            <Selector id="clase-dia" label={t("Día")} value={dia} onChange={setDia} options={Array.from({ length: 7 }, (_, i) => ({ value: i, label: nombreDiaSemana(i) }))} />
          </div>
          <div>
            <label htmlFor={idIni} className="mb-1.5 block text-caption text-fg-secondary">{t("Empieza")}</label>
            <input id={idIni} type="time" value={inicio} onChange={(e) => { setInicio(e.target.value); setError(undefined); }} className={CAMPO} />
          </div>
          <div>
            <label htmlFor={idFin} className="mb-1.5 block text-caption text-fg-secondary">{t("Termina")}</label>
            <input id={idFin} type="time" value={fin} onChange={(e) => { setFin(e.target.value); setError(undefined); }} className={CAMPO} />
          </div>
        </div>
        {error && materia.trim() && <p className="-mt-2 text-caption text-danger" role="alert">{error}</p>}

        <fieldset>
          <legend className="mb-1.5 text-caption text-fg-secondary">{t("Color")}</legend>
          <div role="radiogroup" aria-label={t("Color de la clase")} className="flex flex-wrap gap-2">
            {[...(COLORES_AMIGO.some((c) => c.valor === color) ? [] : [{ nombre: t("Actual"), valor: color }]), ...COLORES_AMIGO].map((c) => (
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          {editando ? (
            confirmarBorrado ? (
              <span className="flex items-center gap-2">
                <span className="text-caption text-fg-secondary">{t("¿Eliminar «{materia}»?", { materia: inicial?.materia ?? "" })}</span>
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
