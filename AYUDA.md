# Ayuda de Nexo

🇬🇧 [English help](HELP.md) · [Volver al README](README.md)

## Instalar

1. Descarga `Nexo_…_x64-setup.exe` de la [última versión](https://github.com/SebastianSKS/nexushub/releases/latest).
2. Ábrelo. Si Windows muestra **«Windows protegió su PC»**, pulsa **Más información** y luego **Ejecutar de todas formas**. Sale porque Nexo es un programa nuevo y pequeño que todavía no tiene el certificado de pago que Windows reconoce; el instalador es el mismo que se publica aquí.
3. Al terminar, Nexo se abre. La primera vez te enseña cómo funciona cada sección (se puede repetir con el botón **¿Cómo funciona?** de cada una).

Se instala solo para tu usuario: no pide permisos de administrador.

## Instalar en Linux

Del mismo Release, baja el `.deb` (Ubuntu, Debian, Mint, Pop!_OS…) o el AppImage, que no necesita instalarse:

```bash
sudo apt install ./Nexo_…_amd64.deb     # o: chmod +x Nexo_…_x86_64.AppImage y ejecutarlo
```

**Qué cambia en Linux**

- **La música no se reproduce dentro de Nexo.** Spotify solo da su protección de contenido (DRM) a los navegadores Chromium, y la ventana de Linux es WebKit, no Chromium. Puedes abrir lo que quieras en la app o en el navegador de Spotify como siempre.
- **La conversión de documentos usa LibreOffice** si lo tienes instalado (Writer para Word, Calc para Excel, Impress para PowerPoint), con la misma fidelidad que guardar como PDF desde ahí. Si no, se usa el motor básico de Nexo, como en Windows sin Office. LibreOffice no sabe pasar un PDF a Word, así que esa conversión siempre usa el motor básico.
- Lo que es solo de Windows simplemente no está: la lista de programas instalados para los accesos directos, y abrir un PDF en su página exacta con Edge.

## Actualizar

Nexo revisa solo al abrir y cada pocas horas. Si hay una versión nueva, sale un aviso con **Actualizar ahora**; se descarga, se instala y Nexo se vuelve a abrir solo. Tus datos se conservan. También puedes comprobarlo en **Configuración › Acerca de › Buscar actualizaciones**.

## Preguntas frecuentes

**No me llegan las notificaciones.**
Nexo avisa mientras esté abierto (aunque sea en la bandeja del sistema; para eso activa *Seguir sonando en la bandeja* en Configuración). Revisa también que no esté activo el **Asistente de concentración / No molestar** de Windows, ni el **No molestar** de Nexo (Configuración › Avisos). Puedes probarlo con *Enviar aviso de prueba*.

**¿Cómo cambio el sonido de los avisos?**
Configuración › Avisos › *Sonido de los avisos*: hay cinco sonidos de Nexo, cinco de Windows y la opción sin sonido. Los de Nexo tienen su propio volumen.

**La música de Spotify no suena.**
Para reproducir dentro de Nexo Spotify pide una cuenta **Premium**. Si acabas de conectarla y no responde, cierra la sesión de Spotify en Configuración y vuelve a conectarla.

**Spotify dice que mi cuenta no está autorizada.**
Spotify limita las aplicaciones nuevas a un puñado de cuentas que su creador autoriza a mano (una regla de Spotify, no de Nexo). Pídele a quien te pasó Nexo que agregue el correo de tu cuenta de Spotify; mientras tanto, Video, Documentos, Calendario, Horario y Calculadora funcionan con normalidad.

**Los videos o la música tardan en cargar.**
Ambas secciones usan YouTube y Spotify y necesitan internet. Si tu navegador o tu antivirus bloquean sus servidores, Nexo no los puede mostrar.

**No convierte un Word, Excel o PowerPoint como esperaba.**
Si tienes Microsoft Office instalado, Nexo lo usa para que el resultado salga igual que guardarlo desde Office (se puede apagar en Configuración › Documentos). Sin Office usa su propio motor, que cubre lo habitual; en cada resultado te avisa qué cosas no se conservan.

**¿Puedo pasarle mi horario a un compañero?**
Sí. En *Horario* pulsa **Compartir**: guardas tu horario en un archivo o copias un código corto para pegarlo en un mensaje. Tu compañero abre *Compartir* en su Nexo, pega el código (o elige el archivo) y lo añade a su horario o lo reemplaza. Solo viaja el horario: nada de tu perfil, tu calendario ni tus notas.

**¿Cómo llevo mi promedio?**
En *Calculadora* hay una pestaña **Promedio**. Añade tus materias (o tráelas desde tu horario), pon cuánto vale cada evaluación y la calificación que ya sacaste. Nexo te dice cómo vas en cada materia y cuánto necesitas sacar en lo que falta para aprobar. Elige la escala de tu escuela (0 a 10 o 0 a 100) y con cuánto se aprueba. Todo se guarda en tu computadora y entra en la copia de seguridad.

**¿Dónde guarda Nexo mis cosas?**
Todo está en tu computadora, nada se sube a internet:
- Ajustes, perfil, horario, calendario, canales y favoritos: en los datos de la aplicación (`%LOCALAPPDATA%\com.nexushub.app`), con una copia automática en `%APPDATA%\NexusHub`.
- Las carpetas de tus materias: `Documentos\Nexo\Tareas`.

**Quiero pasar todo a otra computadora.**
Configuración › Copia de seguridad › *Guardar copia*. En la otra computadora, instala Nexo y usa *Restaurar desde una copia*. La copia no incluye tu sesión de Spotify.

**Algo falló y salió una pantalla de error.**
Tus datos están a salvo. Pulsa **Reintentar** o **Ir al Inicio**; si se repite, usa **Avisar del problema**: abre un reporte en GitHub con la versión y tu sistema ya escritos (nunca tus archivos, calendario ni nombre).

**Nexo va lento en mi computadora.**
Configuración › Apariencia › *Modo de bajo consumo*. En *Automático* (lo normal) se enciende solo si tu equipo tiene pocos núcleos o poca memoria: quita la transparencia de la ventana, baja las animaciones y hace la búsqueda dentro de tus archivos más pausada para que no se note. Puedes ponerlo en *Siempre encendido*. Si aun así va lento, dinos tu equipo con *Avisar del problema*.

**Desinstalar.**
Configuración de Windows › Aplicaciones › Nexo › Desinstalar. Tus carpetas de `Documentos\Nexo\Tareas` no se borran.

## Contacto

Abre un [reporte](https://github.com/SebastianSKS/nexushub/issues/new/choose) contando qué pasó y qué estabas haciendo. Si puedes, pega lo que copia **Configuración › Acerca de › Copiar información técnica**.
