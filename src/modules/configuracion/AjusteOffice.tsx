"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Switch } from "@/components/fluent/Switch";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { officeDisponible, type OfficeDisponible } from "@/services/documents/motor/office";
import { useAjustesStore } from "@/store/ajustes-store";

/**
 * «Convertir con el programa de office»: el nombre del programa no está escrito en el código, lo dice el equipo
 * («Microsoft Office» en Windows, «LibreOffice» en Linux), y la lista de conversiones que puede hacer también: solo
 * Microsoft Word sabe pasar un PDF a Word, así que esa frase solo se enseña donde es cierta.
 */
export function AjusteOffice() {
  const t = useT();
  const usarOffice = useAjustesStore((s) => s.usarOffice);
  const cambiar = useAjustesStore((s) => s.cambiar);
  const [datos, setDatos] = useState<OfficeDisponible | null>(null);
  useEffect(() => {
    void officeDisponible().then(setDatos);
  }, []);

  // Sin nombre conocido (no es la aplicación de escritorio) se enseña el texto genérico.
  const programa = datos?.suite || t("el programa de office");
  const titulo = t("Convertir con {programa}", { programa });
  const descripcion = datos?.pdfWord
    ? t("Si tienes {programa} instalado, las conversiones (Word, Excel y PowerPoint a PDF, y PDF a Word) las hace {programa}: el resultado sale igual que guardarlo desde ahí. Si no, se usa el motor básico de Nexo.", { programa })
    : t("Si tienes {programa} instalado, las conversiones a PDF las hace {programa}: el resultado sale igual que guardarlo desde ahí. Si no, se usa el motor básico de Nexo.", { programa });

  return (
    <TarjetaAjuste glifo="documentos" titulo={titulo} descripcion={descripcion}>
      <Switch checked={usarOffice} onChange={(v) => cambiar({ usarOffice: v })} label={titulo} />
    </TarjetaAjuste>
  );
}
