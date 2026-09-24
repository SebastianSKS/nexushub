//! «Mis tareas»: una carpeta por materia dentro de `Documentos/NexusHub/Tareas`, con archivos de verdad
//! (se ven en el Explorador de Windows, se pueden respaldar, abrir con Word, etc.).
//!
//! Todo lo que toca el disco está aquí, con las mismas reglas de seguridad:
//! - solo se trabaja DENTRO de esa carpeta base; los nombres que llegan de la interfaz se limpian (nada de
//!   `..`, barras ni caracteres que Windows no admite) y nunca se puede salir de ella;
//! - nada se sobrescribe: si ya existe un archivo con ese nombre, el nuevo se guarda como «nombre (2)»;
//! - una carpeta solo se elimina si está vacía, así un clic equivocado nunca borra tareas.

use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{ipc::InvokeBody, ipc::Request, AppHandle, Manager};

const MAX_NOMBRE: usize = 60;
const MAX_ARCHIVO: usize = 120;
const MAX_BYTES: usize = 200 * 1024 * 1024;

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
    let ruta = docs.join("NexusHub").join("Tareas");
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

/// La ruta de la carpeta base, para mostrarla («Documentos\NexusHub\Tareas»).
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

/// Abre en el sistema una carpeta (en el Explorador) o un archivo (con su programa). Sin `carpeta`, la carpeta base.
#[tauri::command]
pub fn abrir_en_sistema(app: AppHandle, carpeta: Option<String>, archivo: Option<String>) -> Result<(), String> {
    let mut ruta = base(&app)?;
    if let Some(c) = carpeta {
        ruta = ruta.join(nombre_seguro(&c)?);
        if let Some(a) = archivo {
            ruta = ruta.join(archivo_seguro(&a)?);
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
    #[cfg(target_os = "windows")]
    let mut orden = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut orden = std::process::Command::new("open");
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut orden = std::process::Command::new("xdg-open");
    orden.arg(&ruta).spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Guarda el resultado de una herramienta de Documentos en la carpeta Descargas y devuelve la ruta completa, para poder
/// avisar dónde quedó. Nunca sobrescribe: si ya hay un archivo igual, este se guarda como «nombre (2)».
/// Cabecera `x-nombre` (codificada con %); el cuerpo son los bytes.
#[tauri::command]
pub fn descarga_guardar(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let nombre = request.headers().get("x-nombre").and_then(|v| v.to_str().ok()).map(descodificar).ok_or_else(|| "Falta el nombre.".to_string())?;
    let nombre = archivo_seguro(&nombre)?;
    let InvokeBody::Raw(bytes) = request.body() else { return Err("No llegó el archivo.".into()) };
    if bytes.len() > MAX_BYTES {
        return Err("El archivo pesa demasiado (máximo 200 MB).".into());
    }
    let carpeta = app.path().download_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
    let final_ = nombre_libre(&carpeta, &nombre);
    let ruta = carpeta.join(&final_);
    std::fs::write(&ruta, bytes).map_err(|e| format!("No se pudo guardar en Descargas: {e}"))?;
    Ok(ruta.to_string_lossy().to_string())
}

/// Muestra en el Explorador un archivo guardado con `descarga_guardar` (solo si está directamente en Descargas).
#[tauri::command]
pub fn descarga_mostrar(app: AppHandle, ruta: String) -> Result<(), String> {
    let ruta = PathBuf::from(ruta);
    let descargas = app.path().download_dir().map_err(|e| e.to_string())?;
    let dentro = ruta.canonicalize().ok().and_then(|r| r.parent().map(|p| p.to_path_buf())).zip(descargas.canonicalize().ok()).map(|(p, d)| p == d).unwrap_or(false);
    if !dentro || !ruta.is_file() {
        return Err("Ese archivo ya no está en Descargas.".into());
    }
    #[cfg(target_os = "windows")]
    {
        // «/select,» resalta el archivo dentro de su carpeta.
        std::process::Command::new("explorer").arg(format!("/select,{}", ruta.to_string_lossy())).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let carpeta = ruta.parent().unwrap_or(&descargas).to_path_buf();
        #[cfg(target_os = "macos")]
        let mut orden = std::process::Command::new("open");
        #[cfg(not(target_os = "macos"))]
        let mut orden = std::process::Command::new("xdg-open");
        orden.arg(carpeta).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
}
