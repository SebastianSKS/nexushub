"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Glifo } from "@/components/fluent/Glifo";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Avatar } from "@/components/shell/Avatar";
import { DialogoPerfil } from "@/components/shell/DialogoPerfil";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { cuando, cumpleEn, fechaLarga, mayuscula, proximoCumple, saludo } from "@/lib/calendario/fechas";
import { useCalendarioStore, type Amigo, type Evento } from "@/store/calendario-store";
import { usePerfilStore } from "@/store/perfil-store";
import { CuadriculaMes } from "./CuadriculaMes";
import { DialogoAmigo, type BorradorAmigo } from "./DialogoAmigo";
import { DialogoEvento, type BorradorEvento } from "./DialogoEvento";
import { NotasRapidas } from "./NotasRapidas";
import { PanelAvisos } from "./PanelAvisos";
import { ProximosCumples } from "./ProximosCumples";
import { ProximosEventos } from "./ProximosEventos";
import { RespaldoCalendario } from "./RespaldoCalendario";
import { VistaSemana } from "./VistaSemana";

type Vista = "mes" | "semana";

/** Frase corta con lo más importante de hoy o de lo que viene. */
function resumen(amigos: Amigo[]): string {
  if (amigos.length === 0) return "Añade los cumpleaños de tus amigos y te avisamos para que no se te pase ninguno.";
  const hoy = new Date();
  const deHoy = amigos.filter((a) => cumpleEn(a, hoy));
  if (deHoy.length > 0) {
    const nombres = deHoy.map((a) => a.nombre);
    const lista = nombres.length === 1 ? nombres[0]! : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
    return `Hoy ${deHoy.length === 1 ? "cumple años" : "cumplen años"} ${lista}. ¡A felicitar!`;
  }
  const [p] = amigos.map((a) => ({ a, p: proximoCumple(a, hoy) })).sort((x, y) => x.p.dias - y.p.dias);
  return `Lo próximo: ${p!.a.nombre} cumple años ${cuando(p!.p.dias).toLowerCase()} (${fechaLarga(p!.p.fecha)}).`;
}

/** /calendario — los cumpleaños de tus amigos, con color, nombre y avisos. */
export function PaginaCalendario() {
  const amigos = useCalendarioStore((s) => s.amigos);
  const eventos = useCalendarioStore((s) => s.eventos);
  const nombre = usePerfilStore((s) => s.nombre);
  const foto = usePerfilStore((s) => s.foto);
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [vista, setVista] = useState<Vista>("mes");
  const [semanaBase, setSemanaBase] = useState(hoy);
  const [borrador, setBorrador] = useState<BorradorAmigo | null>(null);
  const [dialogo, setDialogo] = useState(false);
  const [borradorEvento, setBorradorEvento] = useState<BorradorEvento | null>(null);
  const [dialogoEvento, setDialogoEvento] = useState(false);
  const [perfil, setPerfil] = useState(false);

  useEffect(() => {
    useCalendarioStore.getState().cargar();
    usePerfilStore.getState().cargar();
  }, []);

  const frase = useMemo(() => resumen(amigos), [amigos]);

  const abrir = (b: BorradorAmigo) => {
    setBorrador(b);
    setDialogo(true);
  };
  const abrirEvento = (b: BorradorEvento) => {
    setBorradorEvento(b);
    setDialogoEvento(true);
  };
  const editarEvento = (e: Evento) => {
    const [a, m, d] = e.fecha.split("-").map(Number);
    abrirEvento({ ...e, dia: d!, mes: m!, anio: a! });
  };
  const mover = (delta: -1 | 1) => {
    const m = mes + delta;
    if (m < 1) {
      setMes(12);
      setAnio((a) => a - 1);
    } else if (m > 12) {
      setMes(1);
      setAnio((a) => a + 1);
    } else setMes(m);
  };
  const irAHoy = () => {
    const h = new Date();
    setAnio(h.getFullYear());
    setMes(h.getMonth() + 1);
  };
  const moverSemana = (delta: -1 | 1) => setSemanaBase((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + delta * 7));
  const irAHoySemana = () => setSemanaBase(new Date());

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Calendario" }]}
        titulo="Calendario"
        descripcion="Los cumpleaños de tus amigos, cada uno con su color, y avisos para que no se te pase ninguno."
        accion={
          <div className="flex gap-2">
            <Button onClick={() => abrirEvento({ dia: hoy.getDate(), mes: hoy.getMonth() + 1, anio: hoy.getFullYear() })}>Añadir evento</Button>
            <Button variant="accent" icon={<Glifo nombre="agregar" />} onClick={() => abrir({ dia: hoy.getDate(), mes: hoy.getMonth() + 1 })}>
              Añadir cumpleaños
            </Button>
          </div>
        }
        principal={
          <>
            <section
              aria-label="Saludo"
              className="flex items-center gap-4 rounded-[8px] p-4 text-white shadow-card"
              style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd 0%, #2b88d8 60%, #4aa8ee 100%)" }}
            >
              <Avatar nombre={nombre} foto={foto} tam={56} className="ring-2 ring-white/60" />
              <div className="min-w-0 flex-1">
                <p className="text-subtitle">{nombre ? `${saludo(hoy.getHours())}, ${nombre}` : "¡Hola!"}</p>
                <p className="text-body opacity-95">{frase}</p>
                <p className="mt-0.5 text-caption opacity-80">{mayuscula(fechaLarga(hoy))}</p>
              </div>
              {!nombre && (
                <button type="button" onClick={() => setPerfil(true)} className="rounded-control h-8 shrink-0 border border-white/50 px-3 text-body text-white transition-colors duration-exit ease-fluent hover:bg-white/15">
                  Crear mi perfil
                </button>
              )}
            </section>

            <div className="flex justify-end">
              <SegmentedControl<Vista>
                label="Vista del calendario"
                etiquetaVisible={false}
                value={vista}
                options={[
                  { value: "mes", label: "Mes" },
                  { value: "semana", label: "Semana" },
                ]}
                onChange={setVista}
              />
            </div>

            {vista === "mes" ? (
              <CuadriculaMes
                anio={anio}
                mes={mes}
                amigos={amigos}
                eventos={eventos}
                onMes={mover}
                onHoy={irAHoy}
                onDia={(f) => abrir({ dia: f.getDate(), mes: f.getMonth() + 1 })}
                onAmigo={(a) => abrir(a)}
                onEvento={editarEvento}
              />
            ) : (
              <VistaSemana
                fechaBase={semanaBase}
                amigos={amigos}
                eventos={eventos}
                onSemana={moverSemana}
                onHoy={irAHoySemana}
                onDia={(f) => abrir({ dia: f.getDate(), mes: f.getMonth() + 1 })}
                onAmigo={(a) => abrir(a)}
                onEvento={editarEvento}
              />
            )}
          </>
        }
        lateral={
          <>
            <ProximosCumples amigos={amigos} onAmigo={(a) => abrir(a)} />
            <ProximosEventos eventos={eventos} onEvento={editarEvento} />
            <NotasRapidas />
            <PanelAvisos />
            <RespaldoCalendario />
          </>
        }
      />
      <DialogoAmigo abierto={dialogo} inicial={borrador} onCerrar={() => setDialogo(false)} />
      <DialogoEvento abierto={dialogoEvento} inicial={borradorEvento} onCerrar={() => setDialogoEvento(false)} />
      <DialogoPerfil abierto={perfil} onCerrar={() => setPerfil(false)} />
    </>
  );
}
