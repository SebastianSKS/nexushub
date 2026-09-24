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

/// El script que pide a Windows el icono de cada programa (el mismo que muestra el menú Inicio) y lo devuelve como PNG en base64.
#[cfg(target_os = "windows")]
const SCRIPT_ICONOS: &str = r#"
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore,WindowsBase
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NexusIcono {
  [StructLayout(LayoutKind.Sequential)] public struct SIZE { public int cx; public int cy; }
  [ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IShellItemImageFactory { [PreserveSig] int GetImage(SIZE size, int flags, out IntPtr phbm); }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHCreateItemFromParsingName(string path, IntPtr pbc, [In] ref Guid riid, [MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory ppv);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr h);
  public static IntPtr Obtener(string ruta, int lado) {
    Guid iid = new Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b");
    IShellItemImageFactory f;
    SHCreateItemFromParsingName(ruta, IntPtr.Zero, ref iid, out f);
    IntPtr hbm; SIZE s; s.cx = lado; s.cy = lado;
    int hr = f.GetImage(s, 0, out hbm);
    if (hr != 0) throw new Exception("HRESULT " + hr);
    return hbm;
  }
  public static void Liberar(IntPtr h) { DeleteObject(h); }
}
'@
$ids = $env:NEXUS_APP_IDS | ConvertFrom-Json
$salida = @{}
foreach ($id in $ids) {
  try {
    $h = [NexusIcono]::Obtener('shell:AppsFolder\' + $id, 128)
    $src = [System.Windows.Interop.Imaging]::CreateBitmapSourceFromHBitmap($h, [IntPtr]::Zero, [System.Windows.Int32Rect]::Empty, [System.Windows.Media.Imaging.BitmapSizeOptions]::FromEmptyOptions())
    $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
    $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($src))
    $ms = New-Object System.IO.MemoryStream
    $enc.Save($ms)
    [NexusIcono]::Liberar($h)
    $salida[$id] = [Convert]::ToBase64String($ms.ToArray())
  } catch { }
}
[Console]::Out.Write(($salida | ConvertTo-Json -Compress))
"#;

/// Los iconos reales (PNG en base64) de varios programas, pedidos a Windows. Solo de programas del menú Inicio.
/// Los que no se pudieron sacar simplemente no vienen en el resultado.
#[tauri::command]
pub fn iconos_de_apps(ids: Vec<String>) -> Result<std::collections::HashMap<String, String>, String> {
    #[cfg(target_os = "windows")]
    {
        if ids.is_empty() {
            return Ok(Default::default());
        }
        if CONOCIDAS.lock().map(|c| c.is_empty()).unwrap_or(true) {
            apps_instaladas()?;
        }
        let conocidas = CONOCIDAS.lock().map_err(|_| "Error interno.".to_string())?.clone();
        let validos: Vec<&String> = ids.iter().filter(|i| conocidas.contains(i)).take(40).collect();
        if validos.is_empty() {
            return Ok(Default::default());
        }
        let json = serde_json::to_string(&validos).map_err(|e| e.to_string())?;
        let mut orden = std::process::Command::new("powershell.exe");
        orden.args(["-NoProfile", "-NonInteractive", "-Command", SCRIPT_ICONOS]).env("NEXUS_APP_IDS", json);
        let salida = ejecutar_sin_ventana(orden).map_err(|e| format!("No se pudieron leer los iconos: {e}"))?;
        let texto = String::from_utf8_lossy(&salida.stdout).trim().to_string();
        if texto.is_empty() || texto == "null" {
            return Ok(Default::default());
        }
        serde_json::from_str(&texto).map_err(|_| "No se entendieron los iconos.".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = ids;
        Ok(Default::default())
    }
}
