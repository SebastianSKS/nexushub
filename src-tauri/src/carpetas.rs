//! «Mis tareas»: una carpeta por materia dentro de `Documentos/Nexo/Tareas`, con archivos de verdad
//! (se ven en el Explorador de Windows, se pueden respaldar, abrir con Word, etc.).
//!
//! Todo lo que toca el disco está aquí, con las mismas reglas de seguridad:
//! - solo se trabaja DENTRO de esa carpeta base; los nombres que llegan de la interfaz se limpian (nada de
//!   `..`, barras ni caracteres que Windows no admite) y nunca se puede salir de ella;
//! - nada se sobrescribe: si ya existe un archivo con ese nombre, el nuevo se guarda como «nombre (2)»;
//! - una carpeta solo se elimina si está vacía, así un clic equivocado nunca borra tareas.

use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{ipc::InvokeBody, ipc::Request, ipc::Response, AppHandle, Manager};

const MAX_NOMBRE: usize = 60;
const MAX_ARCHIVO: usize = 120;
const MAX_BYTES: usize = 200 * 1024 * 1024;
/// Los PDF más grandes que esto no se leen para el buscador (tardarían y ocuparían demasiado).
const MAX_BYTES_INDICE: u64 = 80 * 1024 * 1024;

#[derive(Serialize)]
pub struct Carpeta {
    nombre: String,
    archivos: usize,
    /// Última modificación de cualquier archivo de la carpeta (segundos desde 1970), si hay alguno.
    ultima: Option<u64>,
}

#[derive(Serialize)]
pub struct Archivo {
    nombre: String,
    bytes: u64,
    modificado: u64,
}

fn base(app: &AppHandle) -> Result<PathBuf, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    // La carpeta se llamaba «NexusHub» antes de que la aplicación se llamara Nexo: si existe la de antes y aún no la nueva, se
    // le cambia el nombre (con las carpetas de materias adentro). Si no se pudo (un archivo abierto, por ejemplo), se sigue
    // usando la de antes y se reintenta la próxima vez: nunca se pierde ni se duplica nada.
    let nueva = docs.join("Nexo");
    let vieja = docs.join("NexusHub");
    if !nueva.exists() && vieja.exists() {
        let _ = std::fs::rename(&vieja, &nueva);
    }
    let raiz = if !nueva.exists() && vieja.exists() { vieja } else { nueva };
    let ruta = raiz.join("Tareas");
    std::fs::create_dir_all(&ruta).map_err(|e| format!("No se pudo crear la carpeta de tareas: {e}"))?;
    Ok(ruta)
}

/// Cambia por «_» lo que Windows no admite en un nombre (y los caracteres de control).
fn limpiar_caracteres(crudo: &str) -> String {
    const PROHIBIDOS: &[char] = &['<', '>', ':', '"', '/', '\u{5c}', '|', '?', '*'];
    crudo.trim().chars().map(|c| if PROHIBIDOS.contains(&c) || c.is_control() { '_' } else { c }).collect()
}

/// Comprobaciones comunes: no vacío, ni «.» ni «..», y no un nombre reservado de Windows (CON, NUL, LPT1…).
fn validar(limpio: String) -> Result<String, String> {
    let limpio = limpio.trim().trim_end_matches('.').trim().to_string();
    if limpio.is_empty() || limpio == "." || limpio == ".." {
        return Err("Ese nombre no es válido.".into());
    }
    let sin_ext = limpio.split('.').next().unwrap_or("").to_uppercase();
    const RESERVADOS: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if RESERVADOS.contains(&sin_ext.as_str()) {
        return Err("Windows no permite ese nombre; prueba con otro.".into());
    }
    Ok(limpio)
}

/// Nombre de una CARPETA: limpio y de hasta 60 caracteres. Error si no queda nada usable.
fn nombre_seguro(crudo: &str) -> Result<String, String> {
    validar(limpiar_caracteres(crudo).chars().take(MAX_NOMBRE).collect())
}

/// Nombre de un ARCHIVO: admite hasta 120 caracteres y, si hay que acortarlo, conserva la extensión.
fn archivo_seguro(crudo: &str) -> Result<String, String> {
    let sano = limpiar_caracteres(crudo);
    let (raiz, ext) = match sano.rfind('.') {
        Some(i) if i > 0 && sano.chars().count() - sano[..i].chars().count() <= 12 => (&sano[..i], &sano[i..]),
        _ => (sano.as_str(), ""),
    };
    let tope = MAX_ARCHIVO.saturating_sub(ext.chars().count());
    validar(format!("{}{}", raiz.chars().take(tope).collect::<String>().trim_end(), ext))
}

fn carpeta_de(app: &AppHandle, nombre: &str) -> Result<PathBuf, String> {
    Ok(base(app)?.join(nombre_seguro(nombre)?))
}

fn segs(t: std::time::SystemTime) -> u64 {
    t.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// La ruta de la carpeta base, para mostrarla («Documentos\Nexo\Tareas»).
#[tauri::command]
pub fn carpetas_ruta(app: AppHandle) -> Result<String, String> {
    Ok(base(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn carpetas_listar(app: AppHandle) -> Result<Vec<Carpeta>, String> {
    let mut lista = Vec::new();
    for entrada in std::fs::read_dir(base(&app)?).map_err(|e| e.to_string())?.flatten() {
        if !entrada.path().is_dir() {
            continue;
        }
        let mut archivos = 0usize;
        let mut ultima: Option<u64> = None;
        if let Ok(rd) = std::fs::read_dir(entrada.path()) {
            for f in rd.flatten() {
                if f.path().is_file() {
                    archivos += 1;
                    if let Ok(m) = f.metadata().and_then(|m| m.modified()) {
                        ultima = Some(ultima.map_or(segs(m), |u| u.max(segs(m))));
                    }
                }
            }
        }
        lista.push(Carpeta { nombre: entrada.file_name().to_string_lossy().to_string(), archivos, ultima });
    }
    lista.sort_by(|a, b| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()));
    Ok(lista)
}

/// Crea una carpeta y devuelve su nombre final (ya limpio).
#[tauri::command]
pub fn carpeta_crear(app: AppHandle, nombre: String) -> Result<String, String> {
    let limpio = nombre_seguro(&nombre)?;
    let ruta = base(&app)?.join(&limpio);
    if ruta.exists() {
        return Err("Ya existe una carpeta con ese nombre.".into());
    }
    std::fs::create_dir(&ruta).map_err(|e| e.to_string())?;
    Ok(limpio)
}

#[tauri::command]
pub fn carpeta_renombrar(app: AppHandle, actual: String, nuevo: String) -> Result<String, String> {
    let limpio = nombre_seguro(&nuevo)?;
    let desde = carpeta_de(&app, &actual)?;
    let hasta = base(&app)?.join(&limpio);
    if !desde.is_dir() {
        return Err("Esa carpeta ya no existe.".into());
    }
    // Cambiar solo mayúsculas/minúsculas es válido aunque «exista» en Windows.
    if hasta.exists() && !actual.eq_ignore_ascii_case(&limpio) {
        return Err("Ya existe una carpeta con ese nombre.".into());
    }
    std::fs::rename(&desde, &hasta).map_err(|e| e.to_string())?;
    Ok(limpio)
}

/// Solo elimina carpetas VACÍAS: si tiene archivos, avisa en vez de borrarlos.
#[tauri::command]
pub fn carpeta_borrar(app: AppHandle, nombre: String) -> Result<(), String> {
    let ruta = carpeta_de(&app, &nombre)?;
    std::fs::remove_dir(&ruta).map_err(|_| "La carpeta tiene archivos. Bórralos o muévelos primero.".to_string())
}

#[tauri::command]
pub fn archivos_listar(app: AppHandle, carpeta: String) -> Result<Vec<Archivo>, String> {
    let ruta = carpeta_de(&app, &carpeta)?;
    let mut lista = Vec::new();
    for f in std::fs::read_dir(&ruta).map_err(|_| "Esa carpeta ya no existe.".to_string())?.flatten() {
        if let (true, Ok(m)) = (f.path().is_file(), f.metadata()) {
            lista.push(Archivo { nombre: f.file_name().to_string_lossy().to_string(), bytes: m.len(), modificado: m.modified().map(segs).unwrap_or(0) });
        }
    }
    lista.sort_by(|a, b| b.modificado.cmp(&a.modificado));
    Ok(lista)
}

fn descodificar(s: &str) -> String {
    let b = s.as_bytes();
    let mut salida = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            if let Some(v) = s.get(i + 1..i + 3).and_then(|h| u8::from_str_radix(h, 16).ok()) {
                salida.push(v);
                i += 3;
                continue;
            }
        }
        salida.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&salida).to_string()
}

/// Un nombre libre en la carpeta: «tarea.pdf», y si ya existe, «tarea (2).pdf», «tarea (3).pdf»…
fn nombre_libre(carpeta: &Path, nombre: &str) -> String {
    if !carpeta.join(nombre).exists() {
        return nombre.to_string();
    }
    let (raiz, ext) = match nombre.rfind('.') {
        Some(i) if i > 0 => (&nombre[..i], &nombre[i..]),
        _ => (nombre, ""),
    };
    (2..1000).map(|n| format!("{raiz} ({n}){ext}")).find(|c| !carpeta.join(c).exists()).unwrap_or_else(|| nombre.to_string())
}

/// Guarda un archivo dentro de una carpeta. El contenido viaja como cuerpo binario de la petición y el
/// nombre de la carpeta y del archivo en los encabezados `x-carpeta` y `x-nombre` (codificados con %).
#[tauri::command]
pub fn archivo_guardar(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let dato = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(descodificar).ok_or_else(|| "Falta un dato.".to_string());
    let carpeta = carpeta_de(&app, &dato("x-carpeta")?)?;
    let nombre = archivo_seguro(&dato("x-nombre")?)?;
    let InvokeBody::Raw(bytes) = request.body() else { return Err("No llegó el archivo.".into()) };
    if bytes.len() > MAX_BYTES {
        return Err("El archivo pesa demasiado (máximo 200 MB).".into());
    }
    if !carpeta.is_dir() {
        return Err("Esa carpeta ya no existe.".into());
    }
    let final_ = nombre_libre(&carpeta, &nombre);
    std::fs::write(carpeta.join(&final_), bytes).map_err(|e| e.to_string())?;
    Ok(final_)
}

#[tauri::command]
pub fn archivo_borrar(app: AppHandle, carpeta: String, nombre: String) -> Result<(), String> {
    let ruta = carpeta_de(&app, &carpeta)?.join(archivo_seguro(&nombre)?);
    if !ruta.is_file() {
        return Err("Ese archivo ya no existe.".into());
    }
    std::fs::remove_file(ruta).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn archivo_renombrar(app: AppHandle, carpeta: String, actual: String, nuevo: String) -> Result<String, String> {
    let dir = carpeta_de(&app, &carpeta)?;
    let limpio = archivo_seguro(&nuevo)?;
    let desde = dir.join(archivo_seguro(&actual)?);
    let hasta = dir.join(&limpio);
    if !desde.is_file() {
        return Err("Ese archivo ya no existe.".into());
    }
    if hasta.exists() && !actual.eq_ignore_ascii_case(&limpio) {
        return Err("Ya existe un archivo con ese nombre.".into());
    }
    std::fs::rename(desde, hasta).map_err(|e| e.to_string())?;
    Ok(limpio)
}

/// El nombre de algo que YA existe en disco (no lo cambia como `archivo_seguro`, que recorta y limpia los nombres
/// nuevos): solo se rechaza lo que podría salir de la carpeta.
fn nombre_existente(crudo: &str) -> Result<&str, String> {
    if crudo.is_empty() || crudo == "." || crudo == ".." || crudo.contains(['/', '\u{5c}', '\0']) {
        return Err("Ese nombre no es válido.".into());
    }
    Ok(crudo)
}

fn es_pdf(nombre: &str) -> bool {
    Path::new(nombre).extension().and_then(|e| e.to_str()).is_some_and(|e| e.eq_ignore_ascii_case("pdf"))
}

#[derive(Serialize)]
pub struct PdfListado {
    carpeta: String,
    nombre: String,
    bytes: u64,
    modificado: u64,
}

/// Todos los PDF que hay en las carpetas de las materias (para que el buscador sepa qué leer).
#[tauri::command]
pub async fn pdfs_listar(app: AppHandle) -> Result<Vec<PdfListado>, String> {
    let raiz = base(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut lista = Vec::new();
        for c in std::fs::read_dir(&raiz).map_err(|e| e.to_string())?.flatten() {
            if !c.path().is_dir() {
                continue;
            }
            let carpeta = c.file_name().to_string_lossy().to_string();
            if let Ok(rd) = std::fs::read_dir(c.path()) {
                for f in rd.flatten() {
                    let nombre = f.file_name().to_string_lossy().to_string();
                    if let (true, true, Ok(m)) = (f.path().is_file(), es_pdf(&nombre), f.metadata()) {
                        lista.push(PdfListado { carpeta: carpeta.clone(), nombre, bytes: m.len(), modificado: m.modified().map(segs).unwrap_or(0) });
                    }
                }
            }
        }
        Ok(lista)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Los bytes de un PDF de una carpeta de materia, para leerle el texto. Solo PDF y solo dentro de la carpeta base.
#[tauri::command]
pub async fn archivo_leer(app: AppHandle, carpeta: String, nombre: String) -> Result<Response, String> {
    let ruta = base(&app)?.join(nombre_existente(&carpeta)?).join(nombre_existente(&nombre)?);
    if !es_pdf(&nombre) {
        return Err("Solo se pueden leer PDF.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let meta = std::fs::metadata(&ruta).map_err(|_| "Ese archivo ya no existe.".to_string())?;
        if !meta.is_file() {
            return Err("Ese archivo ya no existe.".to_string());
        }
        if meta.len() > MAX_BYTES_INDICE {
            return Err("El archivo pesa demasiado para leerlo.".to_string());
        }
        std::fs::read(&ruta).map(Response::new).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// `file:///C:/…/archivo.pdf#page=N`, con lo que no sea seguro en una dirección escrito como %XX.
#[cfg(target_os = "windows")]
fn direccion_con_pagina(ruta: &Path, pagina: u32) -> String {
    let texto = ruta.to_string_lossy().replace('\u{5c}', "/");
    let texto = texto.trim_start_matches("//?/");
    let mut url = String::from("file:///");
    for b in texto.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b'/' | b':' => url.push(b as char),
            _ => url.push_str(&format!("%{b:02X}")),
        }
    }
    format!("{url}#page={pagina}")
}

/// Abre un PDF en una página concreta con Microsoft Edge (que viene con Windows 11 y entiende «#page=N»).
/// `false` si Edge no está: quien llama abre el archivo con el programa de siempre.
#[cfg(target_os = "windows")]
fn abrir_pdf_en_pagina(ruta: &Path, pagina: u32) -> bool {
    let candidatos = ["ProgramFiles(x86)", "ProgramFiles"].iter().filter_map(|v| std::env::var_os(v)).map(|p| PathBuf::from(p).join("Microsoft").join("Edge").join("Application").join("msedge.exe"));
    for edge in candidatos {
        if edge.is_file() && std::process::Command::new(edge).arg(direccion_con_pagina(ruta, pagina)).spawn().is_ok() {
            return true;
        }
    }
    false
}

/// Abre en el sistema una carpeta (en el Explorador) o un archivo (con su programa). Sin `carpeta`, la carpeta base.
#[tauri::command]
pub fn abrir_en_sistema(app: AppHandle, carpeta: Option<String>, archivo: Option<String>, pagina: Option<u32>) -> Result<(), String> {
    let mut ruta = base(&app)?;
    if let Some(c) = carpeta {
        ruta = ruta.join(nombre_existente(&c)?);
        if let Some(a) = archivo {
            ruta = ruta.join(nombre_existente(&a)?);
        }
    }
    if !ruta.exists() {
        return Err("Eso ya no existe.".into());
    }
    // Comprobación final: nunca abrir nada fuera de la carpeta base.
    let dentro = ruta.canonicalize().ok().zip(base(&app)?.canonicalize().ok()).map(|(r, b)| r.starts_with(b)).unwrap_or(false);
    if !dentro {
        return Err("Ruta no permitida.".into());
    }
    // Un PDF con página (viene del buscador): se abre justo ahí. Si no se puede, se abre con el programa de siempre.
    #[cfg(target_os = "windows")]
    {
        if let (Some(n), true) = (pagina, ruta.is_file() && es_pdf(&ruta.to_string_lossy())) {
            if abrir_pdf_en_pagina(&ruta, n.max(1)) {
                return Ok(());
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    let _ = pagina;
    #[cfg(target_os = "windows")]
    let mut orden = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut orden = std::process::Command::new("open");
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut orden = std::process::Command::new("xdg-open");
    orden.arg(&ruta).spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Guarda el resultado de una herramienta de Documentos y devuelve la ruta completa, para poder avisar dónde quedó.
/// - Con `x-preguntar: 1` se abre el cuadro «Guardar como» de Windows, que arranca en la carpeta de las materias
///   (`Documentos\Nexo\Tareas`); quien lo usa elige carpeta y nombre (el propio cuadro pregunta si va a reemplazar
///   algo). Si se cierra sin guardar, se devuelve `None`.
/// - Sin él, se guarda directo en Descargas, sin sobrescribir nunca («nombre (2)» si ya hay uno igual).
/// Cabecera `x-nombre` (codificada con %); el cuerpo son los bytes.
#[tauri::command]
pub async fn descarga_guardar(app: AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let nombre = request.headers().get("x-nombre").and_then(|v| v.to_str().ok()).map(descodificar).ok_or_else(|| "Falta el nombre.".to_string())?;
    let nombre = archivo_seguro(&nombre)?;
    let preguntar = request.headers().get("x-preguntar").and_then(|v| v.to_str().ok()) == Some("1");
    let InvokeBody::Raw(bytes) = request.body() else { return Err("No llegó el archivo.".into()) };
    if bytes.len() > MAX_BYTES {
        return Err("El archivo pesa demasiado (máximo 200 MB).".into());
    }
    let bytes = bytes.clone();

    let ruta = if preguntar {
        use tauri_plugin_dialog::DialogExt;
        let inicio = base(&app)?;
        let ext = Path::new(&nombre).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let app2 = app.clone();
        let nombre2 = nombre.clone();
        let elegido = tauri::async_runtime::spawn_blocking(move || {
            let mut cuadro = app2.dialog().file().set_title("Guardar").set_directory(inicio).set_file_name(nombre2);
            if !ext.is_empty() {
                cuadro = cuadro.add_filter(ext.to_uppercase(), &[ext.as_str()]);
            }
            cuadro.blocking_save_file()
        })
        .await
        .map_err(|e| e.to_string())?;
        match elegido {
            None => return Ok(None),
            Some(f) => f.into_path().map_err(|e| e.to_string())?,
        }
    } else {
        let carpeta = app.path().download_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
        let final_ = nombre_libre(&carpeta, &nombre);
        carpeta.join(final_)
    };
    std::fs::write(&ruta, bytes).map_err(|e| format!("No se pudo guardar el archivo: {e}"))?;
    Ok(Some(ruta.to_string_lossy().to_string()))
}

/// Muestra en el Explorador un archivo guardado con `descarga_guardar` (solo resalta el archivo; no lo abre ni lo ejecuta).
#[tauri::command]
pub fn descarga_mostrar(ruta: String) -> Result<(), String> {
    let ruta = PathBuf::from(ruta);
    if !ruta.is_file() {
        return Err("Ese archivo ya no está ahí.".into());
    }
    #[cfg(target_os = "windows")]
    {
        // «/select,» resalta el archivo dentro de su carpeta.
        std::process::Command::new("explorer").arg(format!("/select,{}", ruta.to_string_lossy())).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let carpeta = ruta.parent().map(|p| p.to_path_buf()).unwrap_or_default();
        #[cfg(target_os = "macos")]
        let mut orden = std::process::Command::new("open");
        #[cfg(not(target_os = "macos"))]
        let mut orden = std::process::Command::new("xdg-open");
        orden.arg(carpeta).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
}
