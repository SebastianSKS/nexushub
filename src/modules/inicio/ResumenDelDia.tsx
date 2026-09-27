"use client";

import { useEffect, useMemo } from "react";
import { Card } from "@/components/fluent/Card";
import { useAhora } from "@/hooks/useAhora";
import { estadoDelDia, hayAlgoQueMostrar, pendientesDeNotas, proximosDeLaSemana } from "@/lib/dia";
import { useT } from "@/lib/i18n";
import { useCalendarioStore } from "@/store/calendario-store";
import { useHorarioStore } from "@/store/horario-store";
import { useNotasStore } from "@/store/notas-store";
import { BloqueClases } from "./BloqueClases";
import { BloquePendientes } from "./BloquePendientes";
import { BloqueSemana } from "./BloqueSemana";

/**
 * «Tu día»: lo primero que se mira por la mañana, en una tarjeta. Cómo van las clases (en clase, la que sigue con cuenta
 * regresiva, o cuándo vuelven), lo que cae esta semana (exámenes, tareas, citas, cumpleaños) y los apuntes pendientes.
 * Se actualiza sola cada medio minuto. Si no hay nada que contar, no se dibuja (las secciones vacías ya enseñan a empezar).
 */
export function ResumenDelDia() {
  const t = useT();
  const ahora = useAhora();
  const clases = useHorarioStore((s) => s.clases);
  const eventos = useCalendarioStore((s) => s.eventos);
  const amigos = useCalendarioStore((s) => s.amigos);
  const notas = useNotasStore((s) => s.notas);

  useEffect(() => {
    useHorarioStore.getState().cargar();
    useCalendarioStore.getState().cargar();
    useNotasStore.getState().cargar();
  }, []);

  const estado = useMemo(() => (ahora ? estadoDelDia(clases, ahora) : null), [clases, ahora]);
  const semana = useMemo(() => (ahora ? proximosDeLaSemana(eventos, amigos, ahora) : []), [eventos, amigos, ahora]);
  const pendientes = useMemo(() => pendientesDeNotas(notas), [notas]);

  if (!ahora || !estado || !hayAlgoQueMostrar(estado, semana, pendientes.total)) return null;

  const conClases = estado.tipo !== "sin-horario";
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="text-body font-semibold text-fg">{t("Tu día")}</h2>
      {conClases && <BloqueClases estado={estado} />}
      <div className={conClases ? "grid gap-4 border-t border-stroke pt-4 min-[700px]:grid-cols-2" : "grid gap-4 min-[700px]:grid-cols-2"}>
        <BloqueSemana items={semana} />
        <BloquePendientes total={pendientes.total} primeros={pendientes.primeros} />
      </div>
    </Card>
  );
}
