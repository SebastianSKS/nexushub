# Publicar una actualización de NexusHub

NexusHub revisa, al pulsar «Buscar actualizaciones» en Configuración, un archivo `latest.json`
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
4. En GitHub → tu repositorio → **Releases** → **Draft a new release**:
   - Tag: `v` seguido de la versión, p. ej. `v0.1.1`.
   - Adjunta los **tres** archivos que están en
     `src-tauri/target/release/bundle/nsis/`: el instalador `NexusHub_X.Y.Z_x64-setup.exe`,
     el `NexusHub_X.Y.Z_x64-setup.exe.sig` y el `latest.json`.
   - Publica el release (no lo marques como «pre-release»: NexusHub solo mira el más reciente
     que no lo sea).
5. Quien ya tenga NexusHub abierto verá la actualización al pulsar «Buscar actualizaciones» en
   Configuración → Acerca de.

Si algún día quieres que esto se haga solo al hacer `git push` (sin repetir los pasos 2-4 a mano),
se puede montar con GitHub Actions (`tauri-apps/tauri-action`); avísame cuando quieras montarlo.
