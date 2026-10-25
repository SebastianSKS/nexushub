"use client";

import { useT } from "@/lib/i18n";
import { RadioCards } from "@/components/fluent/RadioCards";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { TextInput } from "@/components/fluent/TextInput";
import { contarCandidatos, MAX_LONGITUD_FUERZA, MAX_LONGITUD_NUMEROS } from "@/lib/documents/recuperar-contrasena";
import { useDocumentsStore } from "@/store/documents-store";

export function RecoverOptionsPanel() {
  const t = useT();
  const o = useDocumentsStore((s) => s.options.recoverPdf);
  const setOption = useDocumentsStore((s) => s.setOption);
  const cambiar = (parcial: Partial<typeof o>) => setOption("recoverPdf", { ...useDocumentsStore.getState().options.recoverPdf, ...parcial });

  const total = contarCandidatos(o);
  const muchos = total > 2_000_000;

  return (
    <div className="flex flex-col gap-3">
      <RadioCards
        label={t("Cómo buscarla")}
        value={o.metodo}
        options={[
          { value: "auto", title: t("Automático (recomendado)"), description: t("Prueba sola lo más probable: contraseñas comunes, números y combinaciones cortas.") },
          { value: "comunes", title: t("Contraseñas comunes"), description: t("Prueba las contraseñas más usadas y unas cuantas típicas. Rápido.") },
          { value: "numeros", title: t("Solo números"), description: t("Prueba PIN y fechas: todos los números hasta la longitud que elijas.") },
          { value: "fuerza-bruta", title: t("Todas las combinaciones"), description: t("Prueba combinación por combinación. Útil solo para contraseñas muy cortas.") },
        ]}
        onChange={(metodo) => cambiar({ metodo })}
      />

      {o.metodo === "numeros" && (
        <TextInput
          label={t("Cantidad de dígitos (hasta)")}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_LONGITUD_NUMEROS}
          value={String(o.maxLongitud)}
          onChange={(e) => cambiar({ maxLongitud: e.target.value === "" ? 1 : Number(e.target.value) })}
        />
      )}

      {o.metodo === "fuerza-bruta" && (
        <>
          <SegmentedControl
            label={t("Qué caracteres")}
            value={o.juego}
            options={[
              { value: "numeros", label: t("Números") },
              { value: "letras", label: t("Letras") },
              { value: "letras-numeros", label: t("Ambos") },
            ]}
            onChange={(juego) => cambiar({ juego })}
          />
          <TextInput
            label={t("Longitud máxima")}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_LONGITUD_FUERZA}
            value={String(o.maxLongitud)}
            onChange={(e) => cambiar({ maxLongitud: e.target.value === "" ? 1 : Number(e.target.value) })}
          />
        </>
      )}

      <p className="text-caption text-fg-tertiary">{t("Probará {n} contraseñas como máximo.", { n: total.toLocaleString() })}</p>
      {muchos && <p className="text-caption text-warning-fg">{t("Son muchas: puede tardar bastante. Puedes cancelar en cualquier momento.")}</p>}
      <p className="text-caption text-fg-tertiary">{t("Solo para PDF tuyos cuya contraseña olvidaste. Encuentra contraseñas sencillas; una larga y al azar no se puede recuperar así. Todo ocurre en tu equipo.")}</p>
    </div>
  );
}
