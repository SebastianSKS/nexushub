import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RespaldoPrimero } from "@/components/shell/RespaldoPrimero";
import { Ventana } from "@/components/shell/Ventana";
import "@/styles/tokens.css";
import "@/styles/fluent.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Nexo",
  description: "Video, música y documentos en una sola ventana, con el lenguaje de diseño Fluent de Windows 11.",
};

export const viewport: Viewport = {
  themeColor: "#202020",
};

/**
 * Se ejecuta antes del primer pintado: aplica tema, acento y efecto guardados, para evitar el
 * parpadeo oscuro→claro. Oscuro es el tema por defecto. Refleja lo que hace aplicarAjustes().
 */
const SCRIPT_AJUSTES = `try{var a=JSON.parse(localStorage.getItem("nexushub-ajustes")||"{}"),r=document.documentElement;var t=a.tema==="claro"?"light":a.tema==="sistema"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):"dark";r.dataset.theme=t;r.dataset.efecto=a.efecto==="acrilico"||a.efecto==="ninguno"?a.efecto:"mica";if("__TAURI_INTERNALS__" in window)r.dataset.escritorio="true";if(/^#[0-9a-f]{6}$/i.test(a.acento||"")&&a.acento.toLowerCase()!=="#0078d4"){r.style.setProperty("--accent",a.acento);r.style.setProperty("--accent-hover","color-mix(in srgb, "+a.acento+" 88%, white)");r.style.setProperty("--accent-pressed","color-mix(in srgb, "+a.acento+" 82%, black)")}}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-theme="dark" data-efecto="mica" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AJUSTES }} />
      </head>
      <body>
        <RespaldoPrimero>
          <Ventana>{children}</Ventana>
        </RespaldoPrimero>
      </body>
    </html>
  );
}
