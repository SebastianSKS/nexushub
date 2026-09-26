//! Notificaciones de Windows que, al pulsarlas, llevan a la sección que corresponde (una clase → el Horario, un
//! cumpleaños o un evento → el Calendario…). El plugin de notificaciones no avisa de los clics en escritorio, por eso
//! aquí se muestra el aviso directamente y, al hacer clic, se trae la ventana al frente y se le dice a la interfaz
//! a qué ruta ir (evento `navegar`).

use tauri::{AppHandle, Emitter};

/// El sonido con el que Windows acompaña el aviso, según lo elegido en Configuración: «windows» (el de siempre),
/// «windows-correo», «windows-recordatorio», «windows-sms», «windows-mensaje» o cualquier otra cosa = en silencio
/// (Nexo pone entonces su propio sonido desde la interfaz, o ninguno).
#[cfg(target_os = "windows")]
fn sonido_de(nombre: Option<&str>) -> Option<tauri_winrt_notification::Sound> {
    use tauri_winrt_notification::Sound;
    match nombre {
        Some("windows") => Some(Sound::Default),
        Some("windows-correo") => Some(Sound::Mail),
        Some("windows-recordatorio") => Some(Sound::Reminder),
        Some("windows-sms") => Some(Sound::SMS),
        Some("windows-mensaje") => Some(Sound::IM),
        _ => None,
    }
}

/// Muestra una notificación. `ruta` es una ruta interna de la aplicación («/horario»); solo se aceptan rutas propias.
/// `sonido`: ver `sonido_de`; sin él, el sonido de Windows de siempre.
#[tauri::command]
pub fn notificar(app: AppHandle, titulo: String, cuerpo: String, ruta: Option<String>, sonido: Option<String>) -> Result<(), String> {
    let ruta = ruta.filter(|r| r.starts_with('/') && !r.starts_with("//") && !r.contains(':') && r.len() <= 200);
    #[cfg(target_os = "windows")]
    {
        use tauri_winrt_notification::Toast;
        // Con la identidad de la aplicación (nombre «Nexo» e icono, ver identidad.rs). Solo si no se pudo registrar y se
        // ejecuta desde la carpeta de compilación (sin instalar) se usa la de PowerShell, que Windows sí conoce.
        let en_compilacion = tauri::utils::platform::current_exe()
            .ok()
            .and_then(|e| e.parent().map(|p| p.to_path_buf()))
            .map(|d| {
                let modo = d.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let padre = d.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("");
                padre == "target" && (modo == "debug" || modo == "release")
            })
            .unwrap_or(false);
        let app_id = if en_compilacion && !crate::identidad::registrada() { Toast::POWERSHELL_APP_ID.to_string() } else { app.config().identifier.clone() };
        let app2 = app.clone();
        Toast::new(&app_id)
            .title(&titulo)
            .text1(&cuerpo)
            .sound(match sonido.as_deref() {
                None => Some(tauri_winrt_notification::Sound::Default),
                otro => sonido_de(otro),
            })
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
        let _ = (app, titulo, cuerpo, ruta, sonido);
        Err("Solo en Windows.".into())
    }
}

#[cfg(all(test, target_os = "windows"))]
mod pruebas {
    use super::*;
    use tauri_winrt_notification::Sound;

    #[test]
    fn los_sonidos_de_windows_se_reconocen() {
        assert!(matches!(sonido_de(Some("windows")), Some(Sound::Default)));
        assert!(matches!(sonido_de(Some("windows-correo")), Some(Sound::Mail)));
        assert!(matches!(sonido_de(Some("windows-recordatorio")), Some(Sound::Reminder)));
        assert!(matches!(sonido_de(Some("windows-sms")), Some(Sound::SMS)));
        assert!(matches!(sonido_de(Some("windows-mensaje")), Some(Sound::IM)));
    }

    #[test]
    fn cualquier_otra_cosa_es_silencio() {
        assert!(sonido_de(Some("silencio")).is_none());
        assert!(sonido_de(Some("nexo-campana")).is_none());
        assert!(sonido_de(Some("")).is_none());
        assert!(sonido_de(None).is_none());
    }
}
