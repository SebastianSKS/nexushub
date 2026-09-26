use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

mod captura_spotify;
mod apps;
mod avisos;
mod carpetas;
mod office;

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
        Some(t) => format!("Nexo — {t}"),
        None => "Nexo".to_string(),
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

/// Claves de datos que trae un respaldo (JSON con `datos: { clave: valor }`); vacío si no se puede leer.
fn claves_de(texto: &str) -> std::collections::HashSet<String> {
    serde_json::from_str::<serde_json::Value>(texto)
        .ok()
        .and_then(|v| v.get("datos").and_then(|d| d.as_object()).map(|o| o.keys().cloned().collect()))
        .unwrap_or_default()
}

const COPIAS_HISTORIAL: usize = 12;
const CADA_CUANTO_UNA_COPIA_SEGS: u64 = 6 * 60 * 60;

/// Guarda el respaldo. Se escribe a un archivo temporal y se renombra, así un cierre a mitad de escritura
/// nunca deja un respaldo a medias.
///
/// Antes de reemplazar el respaldo anterior se archiva en `historial/` cuando el nuevo trae MENOS datos
/// (por ejemplo, si el almacenamiento de la ventana se vació y esto es lo poco que se ha vuelto a escribir),
/// o cuando la última copia archivada tiene más de 6 horas. Así un almacenamiento vacío nunca destruye la
/// única copia buena. Se conservan las 12 más recientes.
#[tauri::command]
fn guardar_respaldo(app: tauri::AppHandle, contenido: String) -> Result<(), String> {
    let ruta = ruta_respaldo(&app)?;
    let carpeta = ruta.parent().ok_or("ruta inválida")?;
    std::fs::create_dir_all(carpeta).map_err(|e| e.to_string())?;
    let tmp = carpeta.join("respaldo.json.tmp");
    std::fs::write(&tmp, &contenido).map_err(|e| e.to_string())?;

    if let Ok(viejo) = std::fs::read_to_string(&ruta) {
        let hist = carpeta.join("historial");
        let ahora = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let mut copias: Vec<(u64, std::path::PathBuf)> = std::fs::read_dir(&hist)
            .map(|rd| {
                rd.filter_map(|e| e.ok())
                    .filter_map(|e| {
                        let n = e.file_name().to_string_lossy().to_string();
                        let t = n.strip_prefix("respaldo-")?.strip_suffix(".json")?.parse::<u64>().ok()?;
                        Some((t, e.path()))
                    })
                    .collect()
            })
            .unwrap_or_default();
        copias.sort_by(|a, b| b.0.cmp(&a.0));
        let nuevas = claves_de(&contenido);
        let pierde = claves_de(&viejo).iter().any(|k| !nuevas.contains(k));
        let toca_por_tiempo = copias.first().map(|(t, _)| ahora.saturating_sub(*t) > CADA_CUANTO_UNA_COPIA_SEGS).unwrap_or(true);
        if (pierde || toca_por_tiempo) && !claves_de(&viejo).is_empty() {
            let _ = std::fs::create_dir_all(&hist);
            let _ = std::fs::write(hist.join(format!("respaldo-{ahora}.json")), &viejo);
            copias.insert(0, (ahora, hist.join(format!("respaldo-{ahora}.json"))));
            for (_, sobra) in copias.iter().skip(COPIAS_HISTORIAL) {
                let _ = std::fs::remove_file(sobra);
            }
        }
    }
    std::fs::rename(&tmp, &ruta).map_err(|e| e.to_string())
}

/// Las copias archivadas en `historial/`, de la más reciente a la más antigua (cada una, JSON en texto).
#[tauri::command]
fn leer_historial_respaldo(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let ruta = ruta_respaldo(&app)?;
    let hist = ruta.parent().ok_or("ruta inválida")?.join("historial");
    let mut copias: Vec<(u64, std::path::PathBuf)> = match std::fs::read_dir(&hist) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .filter_map(|e| {
                let n = e.file_name().to_string_lossy().to_string();
                let t = n.strip_prefix("respaldo-")?.strip_suffix(".json")?.parse::<u64>().ok()?;
                Some((t, e.path()))
            })
            .collect(),
        Err(_) => return Ok(vec![]),
    };
    copias.sort_by(|a, b| b.0.cmp(&a.0));
    Ok(copias.into_iter().filter_map(|(_, p)| std::fs::read_to_string(p).ok()).collect())
}

/// Trae la ventana principal al frente (clic izquierdo en el icono o «Mostrar Nexo» del menú).
pub(crate) fn mostrar_ventana(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Una sola instancia: si el usuario abre Nexo de nuevo, se enfoca la ventana que ya está
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
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            actualizar_bandeja,
            leer_respaldo,
            guardar_respaldo,
            leer_historial_respaldo,
            carpetas::carpetas_ruta,
            carpetas::carpetas_listar,
            carpetas::carpeta_crear,
            carpetas::carpeta_renombrar,
            carpetas::carpeta_borrar,
            carpetas::archivos_listar,
            carpetas::archivo_guardar,
            carpetas::archivo_borrar,
            carpetas::archivo_renombrar,
            carpetas::abrir_en_sistema,
            carpetas::pdfs_listar,
            carpetas::archivo_leer,
            carpetas::descarga_guardar,
            carpetas::descarga_mostrar,
            apps::apps_instaladas,
            apps::abrir_app,
            apps::iconos_de_apps,
            apps::icono_de_tipo,
            avisos::notificar,
            office::office_disponible,
            office::office_convertir
        ])
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
            let mostrar = MenuItem::with_id(app, "mostrar", "Mostrar Nexo", true, None::<&str>)?;
            let salir = MenuItem::with_id(app, "salir", "Salir", true, None::<&str>)?;
            let separador = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&reproducir, &siguiente, &separador, &mostrar, &salir])?;

            let tray = TrayIconBuilder::with_id("bandeja")
                .icon(app.default_window_icon().cloned().expect("falta el icono de la app"))
                .tooltip("Nexo")
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
