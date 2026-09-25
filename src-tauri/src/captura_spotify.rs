//! Spotify solo permite `http://127.0.0.1:<puerto>/...` (o HTTPS) como dirección de regreso del
//! inicio de sesión — nunca un esquema propio sin registrar más papeleo. Como la aplicación
//! compilada no tiene ningún servidor real escuchando en ese puerto (el contenido vive en
//! `http://tauri.localhost`), este único servidor HTTP, minúsculo y de un solo propósito, se limita
//! a esperar esa vuelta y reenviar al navegador (con un 302) a la página de retorno real de
//! Nexo, con el `code`/`state` intactos. Debe escuchar en el MISMO puerto que ya está
//! registrado en el panel de Spotify del usuario (127.0.0.1:3000 por defecto).
//!
//! En `tauri dev`, el propio servidor de Next ya sirve esa ruta de verdad en el mismo puerto:
//! este capturador no debe arrancar ahí (chocaría con él), solo en la compilación final.

const PUERTO: &str = "127.0.0.1:3000";
const RUTA: &str = "/api/spotify/callback";

pub fn iniciar() {
    std::thread::spawn(|| {
        let server = match tiny_http::Server::http(PUERTO) {
            Ok(s) => s,
            Err(e) => {
                log::warn!("No se pudo abrir {PUERTO} para el regreso de Spotify (¿algo más lo está usando?): {e}");
                return;
            }
        };
        log::info!("Esperando el regreso de Spotify en {PUERTO}{RUTA}");

        for peticion in server.incoming_requests() {
            let url = peticion.url().to_string();
            let respuesta = if let Some(resto) = url.strip_prefix(RUTA) {
                let query = resto.trim_start_matches('?');
                let destino = if query.is_empty() {
                    format!("http://tauri.localhost{RUTA}/")
                } else {
                    format!("http://tauri.localhost{RUTA}/?{query}")
                };
                match tiny_http::Header::from_bytes(&b"Location"[..], destino.as_bytes()) {
                    Ok(cabecera) => tiny_http::Response::empty(302).with_header(cabecera),
                    Err(_) => tiny_http::Response::empty(500),
                }
            } else {
                tiny_http::Response::empty(404)
            };
            let _ = peticion.respond(respuesta);
        }
    });
}
