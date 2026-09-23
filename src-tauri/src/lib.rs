use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

mod captura_spotify;

/// Lo que el comando `actualizar_bandeja` necesita tocar cada vez que cambia la reproducción:
/// el texto de «Reproducir/Pausar», si «Siguiente» tiene sentido, y el tooltip del icono.
struct EstadoBandeja {
    reproducir: MenuItem<tauri::Wry>,
    siguiente: MenuItem<tauri::Wry>,
    tray: TrayIcon<tauri::Wry>,
}

/// Lo llama el frontend cada vez que cambia la pista o el estado de reproducción, para que la
/// bandeja del sistema (icono, menú y tooltip) refleje lo que realmente está sonando.
#[tauri::command]
fn actualizar_bandeja(
    app: tauri::AppHandle,
    reproduciendo: bool,
    hay_pista: bool,
    siguiente_activo: bool,
    titulo: Option<String>,
) -> Result<(), String> {
    let estado = app.state::<EstadoBandeja>();
    estado
        .reproducir
        .set_text(if reproduciendo { "Pausar" } else { "Reproducir" })
        .map_err(|e| e.to_string())?;
    estado.reproducir.set_enabled(hay_pista).map_err(|e| e.to_string())?;
    estado.siguiente.set_enabled(siguiente_activo).map_err(|e| e.to_string())?;
    let tooltip = match titulo {
        Some(t) => format!("NexusHub — {t}"),
        None => "NexusHub".to_string(),
    };
    estado.tray.set_tooltip(Some(tooltip.as_str())).map_err(|e| e.to_string())?;
    Ok(())
}

/// Carpeta del respaldo de datos: la carpeta de datos del usuario (AppData/Roaming) + NexusHub. Es
/// deliberadamente distinta de la del identificador de la aplicación (`com.nexushub.app`, donde vive el
/// almacenamiento de la ventana), para que sobreviva aunque esa carpeta se borre (desinstalar con «borrar
/// datos», limpiar el navegador incrustado, etc.).
fn ruta_respaldo(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app.path().data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("NexusHub").join("respaldo.json"))
}

/// Devuelve el último respaldo guardado (JSON en texto), o `None` si nunca se guardó uno.
#[tauri::command]
fn leer_respaldo(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let ruta = ruta_respaldo(&app)?;
    match std::fs::read_to_string(&ruta) {
        Ok(t) => Ok(Some(t)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Guarda el respaldo. Se escribe a un archivo temporal y se renombra, así un cierre a mitad de escritura
/// nunca deja un respaldo a medias; y se conserva la copia anterior por si la nueva saliera mala.
#[tauri::command]
fn guardar_respaldo(app: tauri::AppHandle, contenido: String) -> Result<(), String> {
    let ruta = ruta_respaldo(&app)?;
    let carpeta = ruta.parent().ok_or("ruta inválida")?;
    std::fs::create_dir_all(carpeta).map_err(|e| e.to_string())?;
    let tmp = carpeta.join("respaldo.json.tmp");
    std::fs::write(&tmp, contenido).map_err(|e| e.to_string())?;
    if ruta.exists() {
        let _ = std::fs::copy(&ruta, carpeta.join("respaldo.anterior.json"));
    }
    std::fs::rename(&tmp, &ruta).map_err(|e| e.to_string())
}

/// Trae la ventana principal al frente (clic izquierdo en el icono o «Mostrar NexusHub» del menú).
fn mostrar_ventana(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Una sola instancia: si el usuario abre NexusHub de nuevo, se enfoca la ventana que ya está
    // abierta en vez de arrancar una segunda. Debe registrarse antes que cualquier otro plugin.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            mostrar_ventana(app);
        }));
    }

    builder
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![actualizar_bandeja, leer_respaldo, guardar_respaldo])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            } else {
                // Solo en la compilación final: en `tauri dev` el servidor de Next ya sirve esa
                // misma dirección de verdad.
                captura_spotify::iniciar();
            }

            // Bandeja del sistema: reproducir/pausar y siguiente sin tener que abrir la ventana.
            let reproducir = MenuItem::with_id(app, "reproducir", "Reproducir", false, None::<&str>)?;
            let siguiente = MenuItem::with_id(app, "siguiente", "Siguiente", false, None::<&str>)?;
            let mostrar = MenuItem::with_id(app, "mostrar", "Mostrar NexusHub", true, None::<&str>)?;
            let salir = MenuItem::with_id(app, "salir", "Salir", true, None::<&str>)?;
            let separador = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&reproducir, &siguiente, &separador, &mostrar, &salir])?;

            let tray = TrayIconBuilder::with_id("bandeja")
                .icon(app.default_window_icon().cloned().expect("falta el icono de la app"))
                .tooltip("NexusHub")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "reproducir" => {
                        let _ = app.emit("bandeja-alternar", ());
                    }
                    "siguiente" => {
                        let _ = app.emit("bandeja-siguiente", ());
                    }
                    "mostrar" => mostrar_ventana(app),
                    "salir" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        mostrar_ventana(&tray.app_handle().clone());
                    }
                })
                .build(app)?;

            app.manage(EstadoBandeja { reproducir, siguiente, tray });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
