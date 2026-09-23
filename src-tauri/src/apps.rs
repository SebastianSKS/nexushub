//! Programas instalados: para que un acceso directo («Word», «Excel», «Canva»…) abra el programa de tu
//! computadora en vez de una página web. Se leen los mismos programas que muestra el menú Inicio de Windows
//! (`Get-StartApps`: los de escritorio y los de la tienda) y se abren igual que si los pulsaras ahí.

use serde::Serialize;

#[derive(Serialize)]
pub struct AppInstalada {
    nombre: String,
    /// Identificador del menú Inicio (una ruta o un AppUserModelId). Sirve para abrirla, y solo para eso.
    id: String,
}

#[cfg(target_os = "windows")]
fn ejecutar_sin_ventana(mut orden: std::process::Command) -> std::io::Result<std::process::Output> {
    use std::os::windows::process::CommandExt;
    orden.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: que no parpadee una consola
    orden.output()
}

/// Identificadores de la última lista leída: `abrir_app` solo abre lo que está aquí, es decir, lo que de verdad
/// aparece en el menú Inicio (nada de rutas ni órdenes inventadas).
static CONOCIDAS: std::sync::Mutex<Vec<String>> = std::sync::Mutex::new(Vec::new());

/// Los programas del menú Inicio, ordenados por nombre. En un sistema que no es Windows, una lista vacía.
#[tauri::command]
pub fn apps_instaladas() -> Result<Vec<AppInstalada>, String> {
    let apps = leer_apps()?;
    if let Ok(mut c) = CONOCIDAS.lock() {
        *c = apps.iter().map(|a| a.id.clone()).collect();
    }
    Ok(apps)
}

fn leer_apps() -> Result<Vec<AppInstalada>, String> {
    #[cfg(target_os = "windows")]
    {
        let mut orden = std::process::Command::new("powershell.exe");
        orden.args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "[Console]::OutputEncoding=[Text.Encoding]::UTF8; @(Get-StartApps | Select-Object Name,AppID) | ConvertTo-Json -Compress",
        ]);
        let salida = ejecutar_sin_ventana(orden).map_err(|e| format!("No se pudo leer la lista de programas: {e}"))?;
        let texto = String::from_utf8_lossy(&salida.stdout).trim().trim_start_matches('\u{feff}').to_string();
        if texto.is_empty() {
            return Ok(vec![]);
        }
        let valor: serde_json::Value = serde_json::from_str(&texto).map_err(|_| "No se entendió la lista de programas.".to_string())?;
        let lista = match valor {
            serde_json::Value::Array(l) => l,
            otro => vec![otro],
        };
        let mut apps: Vec<AppInstalada> = lista
            .iter()
            .filter_map(|v| {
                let nombre = v.get("Name")?.as_str()?.trim().to_string();
                let id = v.get("AppID")?.as_str()?.trim().to_string();
                (!nombre.is_empty() && !id.is_empty()).then_some(AppInstalada { nombre, id })
            })
            .collect();
        apps.sort_by(|a, b| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()));
        apps.dedup_by(|a, b| a.id == b.id);
        Ok(apps)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![])
    }
}

/// Abre un programa por su identificador del menú Inicio. Solo se aceptan identificadores con caracteres
/// normales (el nombre de un programa o su ruta), nunca órdenes sueltas, y se abre con el propio Explorador:
/// lo que no sea un programa registrado en el menú Inicio, simplemente no abre nada.
#[tauri::command]
pub fn abrir_app(id: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Solo programas del menú Inicio: si aún no se ha leído la lista, se lee ahora.
        let conocido = CONOCIDAS.lock().map(|c| c.contains(&id)).unwrap_or(false);
        if !conocido {
            apps_instaladas()?;
            if !CONOCIDAS.lock().map(|c| c.contains(&id)).unwrap_or(false) {
                return Err("Ese programa no está en tu menú Inicio.".into());
            }
        }
        let valido = !id.is_empty()
            && id.len() <= 400
            && id.chars().all(|c| c.is_alphanumeric() || " {}()[]._-!\\:,&+'".contains(c) || (c as u32) > 127)
            && !id.contains("..");
        if !valido {
            return Err("Ese programa no se puede abrir.".into());
        }
        std::process::Command::new("explorer.exe")
            .arg(format!("shell:AppsFolder\\{id}"))
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("No se pudo abrir el programa: {e}"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = id;
        Err("Esto solo funciona en Windows.".into())
    }
}
