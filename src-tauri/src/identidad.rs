//! La identidad de Nexo en las notificaciones de Windows.
//!
//! Una aplicación que no está «instalada» (o que se abre desde su carpeta de compilación) no tiene nombre ni icono para
//! Windows, y sus avisos salen firmados por «Windows PowerShell». Windows deja registrar esa identidad a mano en
//! `HKCU\Software\Classes\AppUserModelId\<id>` (nombre e icono), sin permisos de administrador: es lo que se hace aquí,
//! cada vez que Nexo arranca. Instalada por el instalador, el acceso directo ya trae la misma identidad y esto solo la
//! repite.

/// El icono que Windows dibuja junto al nombre en cada aviso.
#[cfg(target_os = "windows")]
const ICONO_AVISO: &[u8] = include_bytes!("../icons/128x128.png");

#[cfg(target_os = "windows")]
static REGISTRADA: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// `true` si Windows ya conoce a Nexo por su nombre e icono (los avisos pueden ir con la identidad propia).
#[cfg(target_os = "windows")]
pub fn registrada() -> bool {
    REGISTRADA.load(std::sync::atomic::Ordering::Relaxed)
}

/// Registra el nombre («Nexo») y el icono de la aplicación para las notificaciones. Si algo falla, no pasa nada grave:
/// los avisos siguen saliendo, con la identidad de reserva.
#[cfg(target_os = "windows")]
pub fn registrar(app: &tauri::AppHandle) {
    use tauri::Manager;
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let resultado = (|| -> Result<(), String> {
        let carpeta = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
        let icono = carpeta.join("nexo-aviso.png");
        // Se reescribe solo si cambió (una nueva versión con otro icono) para no tocar el disco en cada arranque.
        if std::fs::read(&icono).map(|b| b != ICONO_AVISO).unwrap_or(true) {
            std::fs::write(&icono, ICONO_AVISO).map_err(|e| e.to_string())?;
        }
        let clave = format!(r"Software\Classes\AppUserModelId\{}", app.config().identifier);
        let (k, _) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(clave).map_err(|e| e.to_string())?;
        k.set_value("DisplayName", &"Nexo").map_err(|e| e.to_string())?;
        k.set_value("IconUri", &icono.to_string_lossy().to_string()).map_err(|e| e.to_string())?;
        k.set_value("IconBackgroundColor", &"FF0F6CBD").map_err(|e| e.to_string())?;
        Ok(())
    })();
    REGISTRADA.store(resultado.is_ok(), std::sync::atomic::Ordering::Relaxed);
}
