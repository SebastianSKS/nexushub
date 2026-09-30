# Publicar una actualización de Nexo

Nexo revisa, al pulsar «Buscar actualizaciones» en Configuración, un archivo `latest.json`
público en un repositorio de GitHub (`plugins.updater.endpoints` en `src-tauri/tauri.conf.json`).
Cada nueva versión se publica ahí a mano, en tres pasos.

**La primera vez**, antes de nada:

1. Crea un repositorio en [github.com/new](https://github.com/new). Puede ser privado o público
   (un repo privado también puede tener Releases públicos si lo prefieres así, o puedes dejarlo
   público del todo). Si el nombre no es exactamente `SebastianSKS/nexushub`, avísame para
   actualizar `tauri.conf.json`.
2. Conéctalo a este proyecto (una sola vez):
   ```bash
   git remote add origin https://github.com/SebastianSKS/nexushub.git
   git push -u origin master
   ```
3. **Nunca subas `src-tauri/nexushub-updater.key`** (la llave privada de firma). Ya está en
   `.gitignore`; solo `nexushub-updater.key.pub` (la pública) puede verse sin problema.

## Cada vez que quieras publicar una versión nueva

1. Sube el número de versión en **tres** archivos (los tres deben decir lo mismo):
   `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`.
2. Compila, firmando con la llave privada:
   ```bash
   $env:TAURI_SIGNING_PRIVATE_KEY = "C:\Users\fidel\OneDrive\Escritorio\centinel\src-tauri\nexushub-updater.key"
   npm run tauri:build
   ```
   (La llave no tiene contraseña, así que no hace falta `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.)
3. Genera el `latest.json`:
   ```bash
   npm run release:manifest
   ```
   Y **revisa todo antes de subirlo** (versiones, firma del instalador con la llave de `tauri.conf.json`,
   `latest.json`). Si algo falla, no lo publiques: dejaría a quien ya tiene Nexo sin poder actualizar.
   ```bash
   npm run release:verificar
   ```
4. En GitHub → tu repositorio → **Releases** → **Draft a new release**:
   - Tag: `v` seguido de la versión, p. ej. `v0.1.1`.
   - Adjunta los **tres** archivos que están en
     `src-tauri/target/release/bundle/nsis/`: el instalador `Nexo_X.Y.Z_x64-setup.exe`,
     el `Nexo_X.Y.Z_x64-setup.exe.sig` y el `latest.json`.
   - Publica el release (no lo marques como «pre-release»: Nexo solo mira el más reciente
     que no lo sea).
5. Comprueba lo ya publicado, como lo haría una copia de Nexo (baja `latest.json` y el instalador desde
   GitHub y verifica la firma):
   ```bash
   npm run release:verificar -- --remoto
   ```
6. Quien ya tenga Nexo abierto verá la actualización al pulsar «Buscar actualizaciones» en
   Configuración → Acerca de.

## Y en Linux (opcional, pero recomendado)

Windows y Linux se publican por separado: el instalador de cada sistema se compila **en ese
sistema**, así que hace falta un equipo Linux para el de Linux. Los pasos 1 y 5 son los mismos
(la versión va en los mismos archivos y `release:verificar -- --remoto` sirve para los dos); lo que
cambia es el empaquetado y la firma.

1. En Linux, con las mismas variables de firma puestas:
   ```bash
   export TAURI_SIGNING_PRIVATE_KEY="$HOME/ruta/a/nexushub-updater.key"
   npm run tauri:build
   ```
   Deja dos cosas en `src-tauri/target/release/bundle/`: el `.deb` en `deb/` y el AppImage en
   `appimage/` (`Nexo_X.Y.Z_x86_64.AppImage`, con su `.sig` al lado, porque sin firma el
   autoactualizador no funciona).
2. Genera el `latest.json` **con la entrada de Linux**, pasando la firma del AppImage:
   ```bash
   npm run release:manifest -- --linux-sig src-tauri/target/release/bundle/appimage/Nexo_X.Y.Z_x86_64.AppImage.sig
   ```
   Sin `--linux-sig` el `latest.json` sale solo con Windows: también es válido, pero quien tenga
   Nexo en Linux tendrá que bajar la versión a mano y no le saldrá el aviso de «Actualizar ahora».
3. Sube al mismo Release los **cinco** archivos:
   - `Nexo_X.Y.Z_x64-setup.exe` y su `.sig` (Windows)
   - `Nexo_X.Y.Z_x86_64.AppImage` y su `.sig` (Linux)
   - `latest.json`
4. `npm run release:verificar -- --remoto` comprueba las plataformas publicadas, incluidas las de
   Linux, así que avisa si la firma del AppImage no es la del archivo.

El `.deb` se puede instalar con `sudo apt install ./Nexo_X.Y.Z_amd64.deb`; el AppImage no necesita
instalarse (`chmod +x` y se ejecuta), aunque tampoco aparece en el menú de aplicaciones.

### Si compilas tú en Linux

Además de las dependencias de Tauri ([las de su
documentación](https://v2.tauri.app/start/prerequisites/#linux)), hacen falta dos más, y
las dos son **paquetes de desarrollo**: sin ellos el programa compila bien pero el
empaquetado se para.

- `libayatana-appindicator3-dev` (el icono de la bandeja). Sin él:
  `Can't detect any appindicator library`.
- `librsvg2-dev` (solo para el AppImage, que usa el complemento *gtk* de linuxdeploy).
  Sin él: `there is no 'libdir' variable for 'librsvg-2.0' library`.

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev patchelf \
                 libayatana-appindicator3-dev librsvg2-dev
```

Los dos se necesitan con su `-dev` aunque la aplicación ya esté instalada en el equipo:
entonces solo está el paquete de ejecución, que no trae el `.pc` que busca pkg-config.

> En Linux la conversión de documentos usa **LibreOffice** si está instalado, igual que en Windows
> se usa Microsoft Office. Sin él se usa el motor básico de Nexo. Ojo: LibreOffice no sabe pasar un
> PDF a Word, así que esa conversión siempre usa el motor básico.

Si algún día quieres que esto se haga solo al hacer `git push` (sin repetir los pasos 2-4 a mano),
se puede montar con GitHub Actions (`tauri-apps/tauri-action`); avísame cuando quieras montarlo.


## Nota sobre el cambio de nombre (NexusHub → Nexo)

Lo que se ve cambió de nombre, pero por dentro se conserva el identificador `com.nexushub.app`, el repositorio `SebastianSKS/nexushub` (de ahí lee las actualizaciones) y la carpeta de respaldo `AppData/Roaming/NexusHub`. Así nadie pierde sus datos. El instalador nuevo se llama `Nexo_X.Y.Z_x64-setup.exe`; quien tenga instalado el programa con el nombre anterior debe desinstalarlo desde Configuración de Windows (los datos se conservan).
