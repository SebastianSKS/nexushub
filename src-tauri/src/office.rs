//! Conversión de documentos con Microsoft Office instalado en el equipo: Word, Excel y PowerPoint exportan a PDF
//! (y Word convierte PDF en documentos editables) con SU propio motor. El resultado es el mismo que si guardaras
//! el archivo como PDF desde Office: la mejor fidelidad posible, y todo ocurre en la computadora (nada sale).
//!
//! Se maneja Office por su interfaz COM, con PowerShell, sin ventanas y con las macros desactivadas. Cada archivo
//! se copia a una carpeta temporal propia, que se borra siempre al terminar. Si Office ya estaba abierto (con el
//! trabajo de la persona), no se cierra: solo se cierra el documento que se abrió para convertir.

use serde::Serialize;
#[cfg(target_os = "windows")]
use std::io::Read;
use std::path::PathBuf;
#[cfg(target_os = "linux")]
use std::path::Path;
use std::time::{Duration, Instant};
use tauri::ipc::{InvokeBody, Request, Response};

/// Un programa de office de los que se puede usar para convertir, y cómo se llama en este equipo.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgramaOffice {
    /// Si está instalado y se puede usar para convertir.
    pub disponible: bool,
    /// Cómo se llama aquí, para ponerlo en los textos: «Microsoft Word» en Windows, «LibreOffice Writer» en Linux.
    pub nombre: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OfficeDisponible {
    word: ProgramaOffice,
    excel: ProgramaOffice,
    powerpoint: ProgramaOffice,
    /// Si además sabe convertir un PDF en un Word. Solo Microsoft Word: LibreOffice abre el PDF como dibujo y el
    /// resultado no sirve, así que en Linux esa opción no se ofrece (el PDF a Word usa el motor básico de Nexo).
    pub pdf_word: bool,
    /// Cómo se llama en conjunto el programa de este equipo («Microsoft Office», «LibreOffice»), para los textos
    /// de Configuración.
    pub suite: String,
}

const TIEMPO_MAXIMO: Duration = Duration::from_secs(150);
const MAX_BYTES: usize = 100 * 1024 * 1024;

/// Nombres de los programas en Windows, donde el motor es Microsoft Office.
#[cfg(target_os = "windows")]
const NOMBRES_WINDOWS: (&str, &str, &str) = ("Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint");

/// Nombres de los módulos de LibreOffice, que en Linux hacen el mismo papel que los de Office.
#[cfg(target_os = "linux")]
const NOMBRES_LINUX: (&str, &str, &str) = ("LibreOffice Writer", "LibreOffice Calc", "LibreOffice Impress");

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

/// Qué programas de office hay instalados en este equipo, y cómo se llaman aquí.
#[tauri::command]
pub async fn office_disponible() -> Result<OfficeDisponible, String> {
    tauri::async_runtime::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            let (w, e, p) = NOMBRES_WINDOWS;
            let script = "$r = @{ word = (Test-Path 'Registry::HKEY_CLASSES_ROOT\\Word.Application\\CLSID'); excel = (Test-Path 'Registry::HKEY_CLASSES_ROOT\\Excel.Application\\CLSID'); powerpoint = (Test-Path 'Registry::HKEY_CLASSES_ROOT\\PowerPoint.Application\\CLSID') }; $r | ConvertTo-Json -Compress";
            let json = match ejecutar_powershell(script, &[], Duration::from_secs(30)) {
                Ok((out, _, true)) => serde_json::from_str::<serde_json::Value>(out.trim()).ok(),
                _ => None,
            };
            let b = |k: &str| json.as_ref().and_then(|v| v.get(k)).and_then(|x| x.as_bool()).unwrap_or(false);
            let word = b("word");
            Ok(OfficeDisponible {
                word: ProgramaOffice { disponible: word, nombre: w.to_string() },
                excel: ProgramaOffice { disponible: b("excel"), nombre: e.to_string() },
                powerpoint: ProgramaOffice { disponible: b("powerpoint"), nombre: p.to_string() },
                pdf_word: word,
                suite: "Microsoft Office".to_string(),
            })
        }
        #[cfg(target_os = "linux")]
        {
            // Un solo programa (soffice) cubre los tres módulos, así que basta con saber si está.
            let hay = hay_libreoffice();
            let (w, e, p) = NOMBRES_LINUX;
            Ok(OfficeDisponible {
                word: ProgramaOffice { disponible: hay, nombre: w.to_string() },
                excel: ProgramaOffice { disponible: hay, nombre: e.to_string() },
                powerpoint: ProgramaOffice { disponible: hay, nombre: p.to_string() },
                pdf_word: false,
                suite: "LibreOffice".to_string(),
            })
        }
        #[cfg(not(any(target_os = "windows", target_os = "linux")))]
        {
            // En cualquier otro sistema solo queda el motor básico de Nexo.
            let no = |nombre: &str| ProgramaOffice { disponible: false, nombre: nombre.to_string() };
            Ok(OfficeDisponible { word: no("Microsoft Word"), excel: no("Microsoft Excel"), powerpoint: no("Microsoft PowerPoint"), pdf_word: false, suite: String::new() })
        }
    })
    .await
    .map_err(|e| e.to_string())?
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

/// Convierte un archivo con el programa de office de este equipo. Cabeceras: `x-motor` (`word-pdf`, `excel-pdf`,
/// `powerpoint-pdf` o `pdf-word`) y `x-extension` (`docx`, `xlsx`, `pptx`, `pdf`…). El cuerpo son los bytes del
/// archivo; se devuelven los bytes del resultado.
#[tauri::command]
pub async fn office_convertir(request: Request<'_>) -> Result<Response, String> {
    let motor = request.headers().get("x-motor").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let ext = request.headers().get("x-extension").and_then(|v| v.to_str().ok()).unwrap_or("").trim_start_matches('.').to_lowercase();
    let bytes = match request.body() {
        InvokeBody::Raw(b) => b.clone(),
        _ => return Err("No llegó el archivo.".into()),
    };
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        tauri::async_runtime::spawn_blocking(move || convertir(&motor, &ext, bytes))
            .await
            .map_err(|e| e.to_string())?
            .map(Response::new)
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = (motor, ext, bytes);
        Err("Esto solo funciona en Windows y Linux.".into())
    }
}

fn convertir(motor: &str, ext: &str, bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    // Qué extensiones se aceptan por motor, y qué sale. El script de PowerShell solo se usa en Windows; en Linux cada
    // motor es un filtro de exportación de LibreOffice (ver convertir_con_libreoffice).
    #[cfg(target_os = "windows")]
    let (script, extensiones, salida_ext): (&str, &[&str], &str) = match motor {
        "word-pdf" => (WORD_A_PDF, &["docx", "docm", "doc", "rtf", "odt"], "pdf"),
        "pdf-word" => (PDF_A_WORD, &["pdf"], "docx"),
        "excel-pdf" => (EXCEL_A_PDF, &["xlsx", "xlsm", "xls", "ods"], "pdf"),
        "powerpoint-pdf" => (POWERPOINT_A_PDF, &["pptx", "pptm", "ppt", "odp"], "pdf"),
        _ => return Err("Motor desconocido.".into()),
    };
    #[cfg(target_os = "linux")]
    let (extensiones, salida_ext): (&[&str], &str) = match motor {
        "word-pdf" => (&["docx", "docm", "doc", "rtf", "odt"], "pdf"),
        // LibreOffice abre un PDF como dibujo: al guardarlo en Word sale un documento inservible, así que este motor
        // no se ofrece en Linux (la interfaz lo esconde con «pdfWord») y aquí solo queda como red de seguridad.
        "pdf-word" => return Err("Este programa no convierte PDF en Word.".into()),
        "excel-pdf" => (&["xlsx", "xlsm", "xls", "ods"], "pdf"),
        "powerpoint-pdf" => (&["pptx", "pptm", "ppt", "odp"], "pdf"),
        _ => return Err("Motor desconocido.".into()),
    };
    if !extensiones.contains(&ext) {
        return Err("Ese tipo de archivo no se puede convertir con el programa de office.".into());
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
        #[cfg(target_os = "windows")]
        {
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
        }
        #[cfg(target_os = "linux")]
        convertir_con_libreoffice(motor, &entrada, &salida, &carpeta)?;
        std::fs::read(&salida).map_err(|e| e.to_string())
    })();
    let _ = std::fs::remove_dir_all(&carpeta);
    resultado
}

// ─── LibreOffice (Linux) ──────────────────────────────────────────────────────────────────────────────────────

/// Dónde puede estar el ejecutable. Se mira primero en el PATH y luego en las rutas de las instalaciones
/// habituales, incluidas las que no lo ponen en el PATH (snap, flatpak y las de /usr/lib).
#[cfg(target_os = "linux")]
fn localizar_libreoffice() -> Option<PathBuf> {
    const EN_EL_PATH: &[&str] = &["soffice", "libreoffice"];
    const ABSOLUTAS: &[&str] = &[
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "/usr/lib/libreoffice/program/soffice",
        "/usr/lib64/libreoffice/program/soffice",
        "/opt/libreoffice/program/soffice",
        "/snap/bin/libreoffice",
        "/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice",
    ];
    // `split_paths` devuelve trozos que apuntan al PATH, así que se copian: hace falta devolverlos.
    for carpeta in std::env::var_os("PATH").into_iter().flat_map(|p| std::env::split_paths(&p).map(|r| r.to_path_buf()).collect::<Vec<_>>()) {
        for nombre in EN_EL_PATH {
            let ruta = carpeta.join(nombre);
            if ruta.is_file() {
                return Some(ruta);
            }
        }
    }
    ABSOLUTAS.iter().map(PathBuf::from).find(|r| r.is_file())
}

/// Si hay LibreOffice instalado y arranca. Se mira una sola vez por proceso: la interfaz lo pregunta al abrir cada
/// herramienta y no tiene sentido lanzar el programa cada vez.
#[cfg(target_os = "linux")]
fn hay_libreoffice() -> bool {
    static HAY: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
    *HAY.get_or_init(|| {
        let Some(ruta) = localizar_libreoffice() else {
            log::info!("No se encontró LibreOffice: se usará el motor básico de Nexo.");
            return false;
        };
        // `--version` no necesita ni perfil ni archivos: solo comprueba que el programa arranca de verdad.
        match std::process::Command::new(ruta).arg("--version").stdin(std::process::Stdio::null()).output() {
            Ok(salida) if salida.status.success() => true,
            _ => {
                log::info!("LibreOffice está instalado pero no arranca: se usará el motor básico de Nexo.");
                false
            }
        }
    })
}

/// `file://` de una ruta, para el argumento `-env:UserInstallation` de LibreOffice. Con un perfil propio (y
/// desechable) la conversión no se enreda con la de un LibreOffice que ya esté abierto ni con el primer arranque.
#[cfg(target_os = "linux")]
fn url_de_ruta(ruta: &Path) -> String {
    let mut url = String::from("file://");
    for b in ruta.to_string_lossy().bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' | b'/' => url.push(b as char),
            _ => url.push_str(&format!("%{b:02X}")),
        }
    }
    url
}

/// Convierte con LibreOffice. Cada motor es un filtro de exportación: Writer, Calc e Impress tienen el suyo para
/// PDF. LibreOffice llama al archivo resultante como la entrada (con otra extensión) en la carpeta de destino, así que
/// al terminar se renombra al nombre que espera quien llama.
#[cfg(target_os = "linux")]
fn convertir_con_libreoffice(motor: &str, entrada: &Path, salida: &Path, carpeta: &Path) -> Result<(), String> {
    use std::process::{Command, Stdio};

    let destino = entrada.parent().unwrap_or(carpeta);
    let filtro = match motor {
        "word-pdf" => "pdf:writer_pdf_Export",
        "excel-pdf" => "pdf:calc_pdf_Export",
        "powerpoint-pdf" => "pdf:impress_pdf_Export",
        _ => return Err("Motor desconocido.".into()),
    };
    let ruta = localizar_libreoffice().ok_or_else(|| "No se encontró LibreOffice en este equipo.".to_string())?;
    let perfil = carpeta.join("perfil");

    let mut orden = Command::new(ruta);
    orden
        .args(["--headless", "--invisible", "--nologo", "--nodefault", "--nofirststartwizard", "--norestore"])
        .arg(format!("-env:UserInstallation={}", url_de_ruta(&perfil)))
        // Ojo: LibreOffice quiere `--convert-to pdf:writer_pdf_Export` con espacio; con `=` dice «Error in option».
        .arg("--convert-to")
        .arg(filtro)
        .arg("--outdir")
        .arg(destino)
        .arg(entrada)
        .stdin(Stdio::null())
        // soffice escribe avisos de arranque por consola que no dicen nada: se descartan para no ensuciar la salida.
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    let mut hijo = orden.spawn().map_err(|e| format!("No se pudo iniciar LibreOffice: {e}"))?;

    // soffice no siempre sale con error aunque no convierta nada, así que además de su código se mira el archivo.
    let inicio = Instant::now();
    let terminado = loop {
        match hijo.try_wait() {
            Ok(Some(estado)) => break Some(estado),
            Ok(None) if inicio.elapsed() > TIEMPO_MAXIMO => {
                // `kill()` solo manda la señal: sin `wait()` el proceso se queda zombie hasta que Nexo se cierre.
                let _ = hijo.kill();
                let _ = hijo.wait();
                break None;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(150)),
            Err(_) => break None,
        }
    };
    let mut err = String::new();
    if let Some(mut s) = hijo.stderr.take() {
        let _ = std::io::Read::read_to_string(&mut s, &mut err);
    }
    let Some(estado) = terminado else {
        return Err("El programa de office tardó demasiado en convertir el archivo.".into());
    };

    // La salida real es la entrada con la extensión nueva («entrada.docx» → «entrada.pdf»).
    let extension = salida.extension().and_then(|e| e.to_str()).unwrap_or("pdf");
    let producido = destino.join(format!("{}.{extension}", entrada.file_stem().and_then(|s| s.to_str()).unwrap_or("entrada")));
    if !estado.success() || !producido.exists() {
        let detalle = err.lines().map(str::trim).find(|l| !l.is_empty()).unwrap_or("").to_string();
        return Err(if detalle.is_empty() { "El programa de office no pudo convertir el archivo (¿está protegido con contraseña o dañado?).".to_string() } else { format!("El programa de office no pudo convertir el archivo: {detalle}") });
    }
    std::fs::rename(&producido, salida).map_err(|e| e.to_string())
}

#[cfg(all(test, target_os = "linux"))]
mod pruebas {
    use super::*;

    /// `localizar_libreoffice` y la conversión real solo se prueban donde hay LibreOffice instalado; si no, se saltan.
    fn sin_libreoffice() -> bool {
        localizar_libreoffice().is_none()
    }

    #[test]
    fn la_url_de_ruta_escapa_lo_que_hay_que_escapar() {
        assert_eq!(url_de_ruta(Path::new("/tmp/Nexo")), "file:///tmp/Nexo");
        assert_eq!(url_de_ruta(Path::new("/tmp/con espacio")), "file:///tmp/con%20espacio");
        // El perfil de LibreOffice va en una carpeta temporal; si el nombre llevara %, lo leería como otra cosa.
        assert_eq!(url_de_ruta(Path::new("/tmp/100%")), "file:///tmp/100%25");
    }

    #[test]
    fn encuentra_libreoffice_e_informa_de_los_tres_modulos() {
        if sin_libreoffice() {
            eprintln!("No hay LibreOffice instalado: se omite.");
            return;
        }
        let d = hay_libreoffice();
        assert!(d, "está instalado pero hay_libreoffice() dijo que no");
    }

    #[test]
    fn convierte_un_rtf_a_pdf_de_verdad() {
        if sin_libreoffice() {
            eprintln!("No hay LibreOffice instalado: se omite.");
            return;
        }
        // Un RTF se escribe a mano en tres líneas: no hace falta guardar ningún archivo de ejemplo en el repo.
        let bytes = br"{\rtf1\ansi\deff0 {\fonttbl {\f0 Arial;}}\f0\fs24 Hola, Nexo.\par}";

        let unica = format!("prueba-{}", std::process::id());
        let carpeta = std::env::temp_dir().join("Nexo").join(unica);
        std::fs::create_dir_all(&carpeta).unwrap();
        let entrada = carpeta.join("entrada.rtf");
        let salida = carpeta.join("salida.pdf");
        std::fs::write(&entrada, bytes).unwrap();

        convertir_con_libreoffice("word-pdf", &entrada, &salida, &carpeta).expect("LibreOffice debería haber convertido el archivo");
        let pdf = std::fs::read(&salida).expect("tiene que existir el PDF con el nombre que pidió quien llama");
        assert_eq!(&pdf[..5], b"%PDF-", "lo que sale no es un PDF");

        // Y la conversión de verdad, con la carpeta temporal y la limpieza de siempre.
        let convertido = convertir("word-pdf", "rtf", bytes.to_vec()).expect("convertir() debería funcionar en Linux");
        assert_eq!(&convertido[..5], b"%PDF-");

        std::fs::remove_dir_all(&carpeta).ok();
    }

    #[test]
    fn pdf_a_word_no_se_ofrece_en_linux() {
        // LibreOffice abriría el PDF como dibujo y devolvería algo inservible: mejor un error claro.
        let err = convertir("pdf-word", "pdf", b"%PDF-1.4".to_vec()).unwrap_err();
        assert!(err.contains("PDF"), "el error debería decir que no sabe: {err}");
    }

    #[test]
    fn rechaza_lo_que_no_puede_convertir() {
        assert!(convertir("word-pdf", "pdf", b"%PDF".to_vec()).is_err(), "un PDF no es un documento de Word");
        assert!(convertir("word-pdf", "docx", Vec::new()).is_err(), "un archivo vacío no se convierte");
        assert!(convertir("inventado", "docx", b"x".to_vec()).is_err(), "un motor que no existe");
    }
}
