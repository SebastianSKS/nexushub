"use client";

import { useT } from "@/lib/i18n";
import { useState } from "react";
import { Glifo } from "@/components/fluent/Glifo";
import { TextInput } from "@/components/fluent/TextInput";
import { useDocumentsStore } from "@/store/documents-store";

export function ProtectOptionsPanel() {
  const t = useT();
  const password = useDocumentsStore((s) => s.options.protectPdf.password);
  const setOption = useDocumentsStore((s) => s.setOption);
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <TextInput
        label={t("Contraseña")}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        value={password}
        maxLength={100}
        placeholder={t("Elige una contraseña")}
        onChange={(e) => setOption("protectPdf", { password: e.target.value })}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="-mt-1 flex items-center gap-1.5 self-start text-caption text-accent-text hover:underline"
      >
        <Glifo nombre={visible ? "ojoTachado" : "ojo"} tam={12} />
        {visible ? t("Ocultar contraseña") : t("Mostrar contraseña")}
      </button>
      <p className="text-caption text-fg-tertiary">{t("Todos los archivos de la lista quedan con esta misma contraseña. Guárdala: si la olvidas, nadie —ni Nexo— puede recuperarla.")}</p>
    </div>
  );
}
