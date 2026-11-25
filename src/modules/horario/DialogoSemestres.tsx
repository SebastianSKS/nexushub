"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { TextInput } from "@/components/fluent/TextInput";
import { useT } from "@/lib/i18n";
import { MAX_NOMBRE_SEMESTRE } from "@/lib/horario/semestres";
import { useSemestresStore } from "@/store/semestres-store";

/** El semestre de ahora: cambiarle el nombre o empezar otro. Los guardados tienen su propia pantalla. */
export function DialogoSemestres({ abierto, onCerrar, onNuevo }: { abierto: boolean; onCerrar: () => void; onNuevo: () => void }) {
  const t = useT();
  const actual = useSemestresStore((s) => s.actual);
  const [nombre, setNombre] = useState(actual);

  useEffect(() => {
    if (abierto) setNombre(useSemestresStore.getState().actual);
  }, [abierto]);

  const guardarNombre = () => {
    useSemestresStore.getState().renombrar(nombre);
    setNombre(useSemestresStore.getState().actual);
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} title={t("Semestre actual")} maxWidth={520}>
      <div className="flex flex-col gap-5">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput label={t("Nombre")} value={nombre} maxLength={MAX_NOMBRE_SEMESTRE} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardarNombre()} />
          </div>
          <Button disabled={!nombre.trim() || nombre.trim() === actual} onClick={guardarNombre}>
            {t("Guardar")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 border-t border-stroke pt-4">
          <p className="text-caption text-fg-secondary">{t("¿Ya empezaste otro? El horario de ahora se guarda en semestres anteriores.")}</p>
          <div>
            <Button variant="accent" onClick={onNuevo}>
              {t("Empezar nuevo semestre")}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
