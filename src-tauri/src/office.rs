//! Conversión de documentos con Microsoft Office instalado en el equipo: Word, Excel y PowerPoint exportan a PDF
//! (y Word convierte PDF en documentos editables) con SU propio motor. El resultado es el mismo que si guardaras
//! el archivo como PDF desde Office: la mejor fidelidad posible, y todo ocurre en la computadora (nada sale).
//!
//! Se maneja Office por su interfaz COM, con PowerShell, sin ventanas y con las macros desactivadas. Cada archivo
//! se copia a una carpeta temporal propia, que se borra siempre al terminar. Si Office ya estaba abierto (con el
//! trabajo de la persona), no se cierra: solo se cierra el documento que se abrió para convertir.

use serde::Serialize;
use std::io::Read;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::ipc::{InvokeBody, Request, Response};

#[derive(Serialize)]
pub struct OfficeDisponible {
    word: bool,
    excel: bool,
    powerpoint: bool,
}

const TIEMPO_MAXIMO: Duration = Duration::from_secs(150);
const MAX_BYTES: usize = 100 * 1024 * 1024;

#[cfg(target_os = "windows")]
fn ejecutar_powershell(script: &str, env: &[(&str, String)], limite: Duration) -> Result<(String, String, bool), String> {
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    let mut orden = Command::new("powershell.exe");
    orden
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    for (k, v) in env {
        orden.env(k, v);
    }
    let mut hijo = orden.spawn().map_err(|e| format!("No se pudo iniciar PowerShell: {e}"))?;
    let inicio = Instant::now();
    loop {
        match hijo.try_wait() {
            Ok(Some(estado)) => {
                let mut out = String::new();
                let mut err = String::new();
                if let Some(mut s) = hijo.stdout.take() {
                    let _ = s.read_to_string(&mut out);
                }
                if let Some(mut s) = hijo.stderr.take() {
                    let _ = s.read_to_string(&mut err);
                }
                return Ok((out, err, estado.success()));
            }
            Ok(None) => {
                if inicio.elapsed() > limite {
                    let _ = hijo.kill();
                    // Matar PowerShell no cierra el Office que abrió: se cierran los que se iniciaron durante esta conversión
                    // (los que ya estaban abiertos, con el trabajo de la persona, son anteriores y no se tocan).
                    let segundos = inicio.elapsed().as_secs() + 5;
                    let limpiar = format!("Get-Process WINWORD,EXCEL,POWERPNT -ErrorAction SilentlyContinue | Where-Object {{ $_.StartTime -gt (Get-Date).AddSeconds(-{segundos}) }} | Stop-Process -Force");
                    let mut orden = Command::new("powershell.exe");
                    orden.args(["-NoProfile", "-NonInteractive", "-Command", &limpiar]).creation_flags(0x0800_0000);
                    let _ = orden.output();
                    return Err("Office tardó demasiado en convertir el archivo.".into());
                }
                std::thread::sleep(Duration::from_millis(150));
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}

/// ¿Qué programas de Office hay instalados? (se mira si están registrados para automatizarse)
#[tauri::command]
pub async fn office_disponible() -> Result<OfficeDisponible, String> {
    #[cfg(target_os = "windows")]
    {
        tauri::async_runtime::spawn_blocking(|| {
            let script = "$r = @{ word = (Test-Path 'Registry::HKEY_CLASSES_ROOT\\Word.Application\\CLSID'); excel = (Test-Path 'Registry::HKEY_CLASSES_ROOT\\Excel.Application\\CLSID'); powerpoint = (Test-Path 'Registry::HKEY_CLASSES_ROOT\\PowerPoint.Application\\CLSID') }; $r | ConvertTo-Json -Compress";
            let (out, _, ok) = ejecutar_powershell(script, &[], Duration::from_secs(30))?;
            if !ok {
                return Ok(OfficeDisponible { word: false, excel: false, powerpoint: false });
            }
            let v: serde_json::Value = serde_json::from_str(out.trim()).map_err(|_| "No se entendió la respuesta.".to_string())?;
            let b = |k: &str| v.get(k).and_then(|x| x.as_bool()).unwrap_or(false);
            Ok(OfficeDisponible { word: b("word"), excel: b("excel"), powerpoint: b("powerpoint") })
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(OfficeDisponible { word: false, excel: false, powerpoint: false })
    }
}

/// Cabecera común de cada script: prepara las variables y una función para saber si el programa ya estaba abierto.
#[cfg(target_os = "windows")]
const PRELUDIO: &str = r#"
$ErrorActionPreference = 'Stop'
$entrada = $env:NEXUS_IN
$salida = $env:NEXUS_OUT
"#;

#[cfg(target_os = "windows")]
const WORD_A_PDF: &str = r#"
$proc = 'WINWORD'; $antes = @(Get-Process $proc -ErrorAction SilentlyContinue).Count
$app = $null; $doc = $null
try {
  $app = New-Object -ComObject Word.Application
  $app.Visible = $false; $app.DisplayAlerts = 0; $app.AutomationSecurity = 3
  $doc = $app.Documents.Open($entrada, $false, $true, $false)
  $doc.ExportAsFixedFormat($salida, 17)
  $doc.Close()
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
finally { if ($app -ne $null -and @(Get-Process $proc -ErrorAction SilentlyContinue).Count -gt $antes) { try { $app.Quit() } catch {} } }
"#;

#[cfg(target_os = "windows")]
const PDF_A_WORD: &str = r#"
$proc = 'WINWORD'; $antes = @(Get-Process $proc -ErrorAction SilentlyContinue).Count
$app = $null; $doc = $null
try {
  $app = New-Object -ComObject Word.Application
  $app.Visible = $false; $app.DisplayAlerts = 0; $app.AutomationSecurity = 3
  $doc = $app.Documents.Open($entrada, $false, $true, $false)
  $doc.SaveAs2($salida, 16)
  $doc.Close()
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
finally { if ($app -ne $null -and @(Get-Process $proc -ErrorAction SilentlyContinue).Count -gt $antes) { try { $app.Quit() } catch {} } }
"#;

#[cfg(target_os = "windows")]
const EXCEL_A_PDF: &str = r#"
$proc = 'EXCEL'; $antes = @(Get-Process $proc -ErrorAction SilentlyContinue).Count
$app = $null; $libro = $null
try {
  $app = New-Object -ComObject Excel.Application
  $app.Visible = $false; $app.DisplayAlerts = $false; $app.AutomationSecurity = 3
  $libro = $app.Workbooks.Open($entrada, 0, $true)
  $libro.ExportAsFixedFormat(0, $salida)
  $libro.Close($false)
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
finally { if ($app -ne $null -and @(Get-Process $proc -ErrorAction SilentlyContinue).Count -gt $antes) { try { $app.Quit() } catch {} } }
"#;

#[cfg(target_os = "windows")]
const POWERPOINT_A_PDF: &str = r#"
$proc = 'POWERPNT'; $antes = @(Get-Process $proc -ErrorAction SilentlyContinue).Count
$app = $null; $pres = $null
try {
  $app = New-Object -ComObject PowerPoint.Application
  $pres = $app.Presentations.Open($entrada, -1, 0, 0)
  $pres.SaveAs($salida, 32)
  $pres.Close()
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
finally { if ($app -ne $null -and $antes -eq 0) { try { $app.Quit() } catch {} } }
"#;

/// Convierte un archivo con Office. Cabeceras: `x-motor` (`word-pdf`, `excel-pdf`, `powerpoint-pdf` o `pdf-word`) y `x-extension`
/// (`docx`, `xlsx`, `pptx`, `pdf`…). El cuerpo son los bytes del archivo; se devuelven los bytes del resultado.
#[tauri::command]
pub async fn office_convertir(request: Request<'_>) -> Result<Response, String> {
    let motor = request.headers().get("x-motor").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let ext = request.headers().get("x-extension").and_then(|v| v.to_str().ok()).unwrap_or("").trim_start_matches('.').to_lowercase();
    let bytes = match request.body() {
        InvokeBody::Raw(b) => b.clone(),
        _ => return Err("No llegó el archivo.".into()),
    };
    #[cfg(target_os = "windows")]
    {
        tauri::async_runtime::spawn_blocking(move || convertir(&motor, &ext, bytes))
            .await
            .map_err(|e| e.to_string())?
            .map(Response::new)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (motor, ext, bytes);
        Err("Esto solo funciona en Windows.".into())
    }
}

#[cfg(target_os = "windows")]
fn convertir(motor: &str, ext: &str, bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    // Qué extensiones se aceptan por motor, y qué sale.
    let (script, extensiones, salida_ext): (&str, &[&str], &str) = match motor {
        "word-pdf" => (WORD_A_PDF, &["docx", "docm", "doc", "rtf", "odt"], "pdf"),
        "pdf-word" => (PDF_A_WORD, &["pdf"], "docx"),
        "excel-pdf" => (EXCEL_A_PDF, &["xlsx", "xlsm", "xls", "ods"], "pdf"),
        "powerpoint-pdf" => (POWERPOINT_A_PDF, &["pptx", "pptm", "ppt", "odp"], "pdf"),
        _ => return Err("Motor desconocido.".into()),
    };
    if !extensiones.contains(&ext) {
        return Err("Ese tipo de archivo no se puede convertir con Office.".into());
    }
    if bytes.is_empty() || bytes.len() > MAX_BYTES {
        return Err("El archivo está vacío o pesa demasiado (máximo 100 MB).".into());
    }

    // Carpeta temporal propia, siempre borrada al terminar.
    let unica = format!("{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
    let carpeta: PathBuf = std::env::temp_dir().join("Nexo").join(unica);
    std::fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
    let resultado = (|| {
        let entrada = carpeta.join(format!("entrada.{ext}"));
        let salida = carpeta.join(format!("salida.{salida_ext}"));
        std::fs::write(&entrada, &bytes).map_err(|e| e.to_string())?;
        let cuerpo = format!("{PRELUDIO}\n{script}");
        let (_out, err, ok) = ejecutar_powershell(
            &cuerpo,
            &[("NEXUS_IN", entrada.to_string_lossy().to_string()), ("NEXUS_OUT", salida.to_string_lossy().to_string())],
            TIEMPO_MAXIMO,
        )?;
        if !ok || !salida.exists() {
            let detalle = err.lines().next().unwrap_or("").trim().to_string();
            return Err(if detalle.is_empty() { "Office no pudo convertir el archivo (¿está protegido con contraseña o dañado?).".to_string() } else { format!("Office no pudo convertir el archivo: {detalle}") });
        }
        std::fs::read(&salida).map_err(|e| e.to_string())
    })();
    let _ = std::fs::remove_dir_all(&carpeta);
    resultado
}
