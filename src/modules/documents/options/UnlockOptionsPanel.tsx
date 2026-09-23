"use client";

import { useState } from "react";
import { Glifo } from "@/components/fluent/Glifo";
import { TextInput } from "@/components/fluent/TextInput";
import { useDocumentsStore } from "@/store/documents-store";

export function UnlockOptionsPanel() {
  const password = useDocumentsStore((s) => s.options.unlockPdf.password);
  const setOption = useDocumentsStore((s) => s.setOption);
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <TextInput
        label="Contraseña del PDF"
        type={visible ? "text" : "password"}
        autoComplete="off"
        value={password}
        maxLength={100}
        placeholder="La contraseña que pide al abrirlo"
        onChange={(e) => setOption("unlockPdf", { password: e.target.value })}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="-mt-1 flex items-center gap-1.5 self-start text-caption text-accent-text hover:underline"
      >
        <Glifo nombre={visible ? "ojoTachado" : "ojo"} tam={12} />
        {visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      </button>
      <p className="text-caption text-fg-tertiary">El resultado queda como páginas-imagen, sin contraseña: ya no tendrá texto seleccionable ni se podrá editar como el original.</p>
    </div>
  );
}
