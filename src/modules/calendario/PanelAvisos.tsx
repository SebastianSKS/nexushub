"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { Selector } from "@/components/fluent/Selector";
import { Switch } from "@/components/fluent/Switch";
import { notificarSistema, pedirPermisoNotificaciones, permisoNotificaciones, type PermisoNotificaciones } from "@/lib/notificar";
import { useCalendarioStore } from "@/store/calendario-store";

type Permiso = PermisoNotificaciones;

function Fila({ etiqueta, valor, onChange }: { etiqueta: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-body text-fg">{etiqueta}</span>
      <Switch checked={valor} onChange={onChange} label={etiqueta} />
    </div>
  );
}

/** Configuración de los avisos: cuándo avisar, a qué hora, y el permiso para notificaciones del sistema. */
export function PanelAvisos() {
  const avisos = useCalendarioStore((s) => s.avisos);
  const cambiar = useCalendarioStore((s) => s.cambiarAvisos);
  const [permiso, setPermiso] = useState<Permiso>("default");
  const [prueba, setPrueba] = useState<string | null>(null);

  useEffect(() => {
    void permisoNotificaciones().then(setPermiso);
  }, []);

  const pedirPermiso = async () => setPermiso(await pedirPermisoNotificaciones());

  const probar = async () => {
    const ok = await notificarSistema("NexusHub", "Así se verán tus avisos de cumpleaños.", "prueba", "/calendario");
    setPrueba(ok ? "Enviamos una notificación de prueba: debería aparecer en la esquina de tu pantalla." : "No se pudo enviar la notificación de prueba.");
  };

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-body font-semibold text-fg">
        <Glifo nombre="campana" tam={16} className="text-accent-text" /> Avisos
      </h2>
      <p className="mb-2 text-caption text-fg-secondary">Te avisamos con una notificación cuando se acerque un cumpleaños.</p>

      <Fila etiqueta="El mismo día" valor={avisos.mismoDia} onChange={(v) => cambiar({ mismoDia: v })} />
      <Fila etiqueta="Un día antes" valor={avisos.unDiaAntes} onChange={(v) => cambiar({ unDiaAntes: v })} />
      <Fila etiqueta="Una semana antes" valor={avisos.unaSemanaAntes} onChange={(v) => cambiar({ unaSemanaAntes: v })} />

      <div className="flex items-center justify-between gap-3 py-1.5">
        <label htmlFor="hora-aviso" className="text-body text-fg">Avisar a partir de las</label>
        <div className="w-[110px]">
          <Selector
            id="hora-aviso"
            label="Avisar a partir de las"
            value={avisos.hora}
            onChange={(hora) => cambiar({ hora })}
            options={Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, "0")}:00` }))}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-stroke pt-3">
        {permiso === "granted" && (
          <>
            <p className="text-caption text-fg-secondary">Las notificaciones del sistema están activadas.</p>
            <Button onClick={() => void probar()} className="self-start">Enviar aviso de prueba</Button>
            {prueba && <p className="text-caption text-fg-secondary" role="status">{prueba}</p>}
          </>
        )}
        {permiso === "default" && (
          <>
            <p className="text-caption text-fg-secondary">Para ver los avisos como notificaciones del sistema, permite las notificaciones.</p>
            <Button variant="accent" onClick={() => void pedirPermiso()} className="self-start">Activar notificaciones</Button>
          </>
        )}
        {permiso === "denied" && (
          <InfoBar severity="warning" title="Las notificaciones están bloqueadas.">
            Para permitirlas, pulsa el candado de la barra de direcciones, abre «Notificaciones» y elige «Permitir». Mientras tanto verás los avisos dentro de la aplicación.
          </InfoBar>
        )}
        {permiso === "no-soportado" && (
          <InfoBar severity="info" title="Este equipo no admite notificaciones del sistema.">
            Verás los avisos dentro de la aplicación.
          </InfoBar>
        )}
        <p className="text-caption text-fg-tertiary">Los avisos funcionan mientras NexusHub esté abierto. Para que avise siempre, actívalo al iniciar Windows y déjalo en la bandeja (Configuración › Aplicación).</p>
      </div>
    </Card>
  );
}
