//! Notificaciones de Windows que, al pulsarlas, llevan a la sección que corresponde (una clase → el Horario, un
//! cumpleaños o un evento → el Calendario…). El plugin de notificaciones no avisa de los clics en escritorio, por eso
//! aquí se muestra el aviso directamente y, al hacer clic, se trae la ventana al frente y se le dice a la interfaz
//! a qué ruta ir (evento `navegar`).

use tauri::{AppHandle, Emitter};

/// Muestra una notificación. `ruta` es una ruta interna de la aplicación («/horario»); solo se aceptan rutas propias.
#[tauri::command]
pub fn notificar(app: AppHandle, titulo: String, cuerpo: String, ruta: Option<String>) -> Result<(), String> {
    let ruta = ruta.filter(|r| r.starts_with('/') && !r.starts_with("//") && !r.contains(':') && r.len() <= 200);
    #[cfg(target_os = "windows")]
    {
        use tauri_winrt_notification::{Sound, Toast};
        // Instalada, la notificación va con la identidad de la aplicación; ejecutada desde la carpeta de compilación no
        // está registrada en Windows y se usa la de PowerShell (igual que hace el plugin).
        let en_compilacion = tauri::utils::platform::current_exe()
            .ok()
            .and_then(|e| e.parent().map(|p| p.to_path_buf()))
            .map(|d| {
                let modo = d.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let padre = d.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("");
                padre == "target" && (modo == "debug" || modo == "release")
            })
            .unwrap_or(false);
        let app_id = if en_compilacion { Toast::POWERSHELL_APP_ID.to_string() } else { app.config().identifier.clone() };
        let app2 = app.clone();
        Toast::new(&app_id)
            .title(&titulo)
            .text1(&cuerpo)
            .sound(Some(Sound::Default))
            .on_activated(move |_| {
                crate::mostrar_ventana(&app2);
                if let Some(r) = &ruta {
                    let _ = app2.emit("navegar", r.clone());
                }
                Ok(())
            })
            .show()
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, titulo, cuerpo, ruta);
        Err("Solo en Windows.".into())
    }
}
