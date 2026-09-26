"use client";

/**
 * El último recurso: si falla algo en el armazón mismo de la ventana (lo que rodea a todas las secciones), Next reemplaza
 * la página entera por esta. No puede usar los estilos ni los textos de la aplicación, así que va sola: colores claros u
 * oscuros según Windows, español o inglés según el idioma del sistema, y un botón que vuelve a abrir todo.
 */
export default function ErrorGlobal({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const ingles = typeof navigator !== "undefined" && /^en/i.test(navigator.language);
  const texto = ingles
    ? { titulo: "Nexo hit a problem", cuerpo: "Your data is safe. Close and reopen Nexo, or try again from here.", boton: "Try again" }
    : { titulo: "Nexo tuvo un problema", cuerpo: "Tus datos están a salvo. Cierra y vuelve a abrir Nexo, o intenta de nuevo desde aquí.", boton: "Reintentar" };
  return (
    <html lang={ingles ? "en" : "es"}>
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#202020", color: "#fff", fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif" }}>
        <main style={{ maxWidth: 440, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>{texto.titulo}</h1>
          <p style={{ fontSize: 14, opacity: 0.8, margin: "0 0 20px" }}>{texto.cuerpo}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: "#0078D4", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, padding: "6px 20px", fontSize: 14, cursor: "pointer" }}
          >
            {texto.boton}
          </button>
        </main>
      </body>
    </html>
  );
}
