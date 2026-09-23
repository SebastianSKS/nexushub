"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { Avatar } from "@/components/shell/Avatar";
import { DialogoPerfil } from "@/components/shell/DialogoPerfil";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { fechaLarga, mayuscula, saludo } from "@/lib/calendario/fechas";
import { itemsDelDia } from "@/lib/calendario/items";
import { SECCIONES } from "@/lib/rutas";
import { useCalendarioStore } from "@/store/calendario-store";
import { usePerfilStore } from "@/store/perfil-store";
import { ProximosEventos } from "../calendario/ProximosEventos";
import { ClasesDeHoy } from "./ClasesDeHoy";

/** Lo que hace cada sección, en una línea, para quien abre NexusHub por primera vez. */
const DESCRIPCION: Record<string, string> = {
  video: "Los videos nuevos de los canales de YouTube que sigues, en un solo muro.",
  musica: "Tu música de Spotify, con favoritos, recientes y reproductor grande.",
  documentos: "Unir, dividir, comprimir, convertir y proteger PDF, sin subir nada a internet.",
  calendario: "Tareas, exámenes, citas y cumpleaños, con avisos para que no se te pase ninguno.",
  horario: "Tus clases de la semana. Escanea la imagen del horario y se llena sola.",
  calculadora: "Normal y científica, con historial.",
};

/** Frase sobre lo que pasa hoy en el calendario. */
function frase(titulos: string[]): string {
  if (titulos.length === 0) return "Hoy no tienes nada en el calendario. ¿Qué quieres hacer?";
  if (titulos.length === 1) return `Hoy en tu calendario: ${titulos[0]}.`;
  return `Hoy tienes ${titulos.length} cosas en el calendario: ${titulos.slice(0, 2).join(", ")}${titulos.length > 2 ? "…" : ""}.`;
}

/** Pantalla de bienvenida: saludo con el nombre del perfil, accesos a las secciones y lo próximo del calendario. */
export function PaginaInicio() {
  const router = useRouter();
  const nombre = usePerfilStore((s) => s.nombre);
  const foto = usePerfilStore((s) => s.foto);
  const amigos = useCalendarioStore((s) => s.amigos);
  const eventos = useCalendarioStore((s) => s.eventos);
  const [perfil, setPerfil] = useState(false);
  // La hora se fija al montar: evita que el saludo cambie a media lectura.
  const [hoy] = useState(() => new Date());

  useEffect(() => {
    usePerfilStore.getState().cargar();
    useCalendarioStore.getState().cargar();
  }, []);

  const deHoy = useMemo(() => itemsDelDia(amigos, eventos, hoy).map((i) => i.titulo), [amigos, eventos, hoy]);
  const secciones = SECCIONES.filter((s) => s.id in DESCRIPCION);

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Inicio" }]}
        titulo="Inicio"
        descripcion="Video, Música, Documentos, Calendario, Horario y Calculadora, a un clic."
        principal={
          <>
            <section
              aria-label="Bienvenida"
              className="flex items-center gap-4 rounded-[8px] p-5 text-white shadow-card"
              style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd 0%, #2b88d8 60%, #4aa8ee 100%)" }}
            >
              <Avatar nombre={nombre} foto={foto} tam={64} className="ring-2 ring-white/60" />
              <div className="min-w-0 flex-1">
                <p className="text-title">{nombre ? `${saludo(hoy.getHours())}, ${nombre}` : "Te damos la bienvenida a NexusHub"}</p>
                <p className="mt-1 text-body opacity-95">{frase(deHoy)}</p>
                <p className="mt-0.5 text-caption opacity-80">{mayuscula(fechaLarga(hoy))}</p>
              </div>
              {!nombre && (
                <button type="button" onClick={() => setPerfil(true)} className="rounded-control h-8 shrink-0 border border-white/50 px-3 text-body text-white transition-colors duration-exit ease-fluent hover:bg-white/15">
                  Poner mi nombre
                </button>
              )}
            </section>

            <ClasesDeHoy />

            <ul className="grid gap-3 min-[700px]:grid-cols-2" aria-label="Secciones">
              {secciones.map((s) => (
                <li key={s.id}>
                  <Link href={s.ruta} className="reveal rounded-control flex h-full items-start gap-4 border border-stroke bg-layer p-4 shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white" aria-hidden>
                      <Glifo nombre={s.glifo} tam={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body font-semibold text-fg">{s.etiqueta}</span>
                      <span className="mt-0.5 block text-caption text-fg-secondary">{DESCRIPCION[s.id]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {eventos.length > 0 ? (
              <ProximosEventos eventos={eventos} onEvento={() => router.push("/calendario")} />
            ) : (
              <Card className="p-4">
                <p className="text-body text-fg-secondary">Cuando añadas eventos en el Calendario, los próximos aparecerán aquí.</p>
              </Card>
            )}
          </>
        }
      />
      <DialogoPerfil abierto={perfil} onCerrar={() => setPerfil(false)} />
    </>
  );
}
