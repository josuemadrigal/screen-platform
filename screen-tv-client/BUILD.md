# 📺 Screen TV Client — Guía de Build

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 18+ |
| JDK | 17 o 21 |
| Android Studio | Hedgehog / Iguana+ |
| Android SDK | API 21 mínimo, API 34 recomendado |

---

## 1. Configurar URLs del servidor

Edita el archivo `.env` antes de compilar:

```env
VITE_API_URL=https://tu-servidor.com
VITE_SOCKET_URL=https://tu-servidor.com
```

> ⚠️ Las URLs deben ser **HTTPS** en producción para Android TV.

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Inicializar Capacitor (solo la primera vez)

> Atajo: los pasos 4, 5 y 6 los aplica `npm run android:setup` tras `npx cap add android`
> (manifest de TV, banner, SDK 35 y Gradle; ver `android-config/README.md`).

```bash
npx cap init "Screen TV" com.screenmanager.tvclient --web-dir dist
npx cap add android
```

---

## 4. Configurar AndroidManifest.xml para Android TV

Edita `android/app/src/main/AndroidManifest.xml` y **reemplaza** el `<intent-filter>` de la actividad principal con:

```xml
<intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <!-- App de TV en el launcher de Android TV -->
    <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    <!-- También disponible como app normal -->
    <category android:name="android.intent.category.LAUNCHER" />
</intent-filter>
```

Y agrega el atributo `android:banner` en el `<application>` tag para el banner en la pantalla de inicio de TV:

```xml
<application
    android:banner="@drawable/tv_banner"
    ...>
```

Crea el archivo banner en `android/app/src/main/res/drawable/tv_banner.png`
(Tamaño recomendado: 320×180 px)

---

## 5. Indicar que es app de TV en AndroidManifest.xml

Agrega dentro del tag `<manifest>`:

```xml
<!-- Indica que la app funciona en TV -->
<uses-feature android:name="android.software.leanback" android:required="false" />
<!-- Touch no requerido (control remoto) -->
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
```

---

## 6. Aumentar versión de SDK en build.gradle

Edita `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 21   // Android TV mínimo API 21
        targetSdkVersion 34
    }
}
```

---

## 7. Build completo (web + Android)

```bash
# Build web + sincronizar con Capacitor
npm run cap:sync

# Abrir en Android Studio para build/debug
npm run cap:open
```

---

## 8. Generar el APK Debug (pruebas)

Dentro de Android Studio:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**

O por línea de comandos:

```bash
cd android
./gradlew assembleDebug
```

APK generado en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 9. Generar APK Release (producción)

```bash
cd android
./gradlew assembleRelease
```

> Para distribución necesitas firmar el APK. Consulta:
> https://developer.android.com/studio/publish/app-signing

---

## 10. Instalar en Smart TV vía ADB

```bash
# Con la TV en la misma red, habilitar ADB en TV:
# Ajustes → Acerca del TV → Opciones de desarrollador → ADB

adb connect TU_IP_TV:5555
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 11. Workflow de desarrollo rápido

```bash
# Servidor web local para pruebas en browser
npm run dev

# Cambios → rebuild → sync en un solo comando
npm run cap:sync
```

---

## Videos sin internet (app nativa)

En la app de Android los videos de la playlist se descargan una vez al almacenamiento privado
de la app (`files/videos/`) y se reproducen desde ahí. Si la TV pierde internet, arranca con la
lista guardada en las preferencias de la app (`@capacitor/preferences`) y reproduce todo desde disco. Los videos que salen de la playlist se
borran automáticamente. Ver `src/hooks/useVideoStore.ts`.

### Probar contra un API local (HTTP) en el emulador

Producción es HTTPS de extremo a extremo. Solo para pruebas con un API en tu máquina:

```bash
# .env -> VITE_API_URL=http://10.0.2.2:4006 (10.0.2.2 es el host visto desde el emulador)
npm run build && CAP_CLEARTEXT=1 npx cap sync android
# añade android:usesCleartextTraffic="true" al <application> del manifest generado
cd android && ./gradlew assembleDebug
```

Antes del build de producción vuelve a poner la URL HTTPS, ejecuta `npx cap sync android`
sin `CAP_CLEARTEXT` y quita `usesCleartextTraffic` del manifest.

---

## Actualizar la app (interfaz o lógica)

1. Edita el código en `src/` y pruébalo en el navegador con `npm run dev`.
2. Comprueba que `.env` apunta al API público (`https://api.<dominio>:<puerto>`).
3. Genera el APK con un solo comando; sube el número de versión para que Android lo
   instale como actualización:

```bash
npm run apk
```

   Es un build *release*: código reducido con R8, solo arquitecturas ARM (las de TVs y
   teléfonos) y firmado con la clave de depuración local (`~/.android/debug.keystore`), que
   basta para instalar a mano. Para publicar en Google Play habría que crear una clave propia
   y ponerla en `signingConfigs.release` de `android/app/build.gradle`. Pesa unos 2 MB.

4. Instala en cada TV por USB o con `adb install -r android/app/build/outputs/apk/release/app-release.apk`.
   La app conserva el código vinculado y los videos descargados.

---

## Publicar el APK para descargarlo desde la web

```bash
npm run apk
SCREEN_SERVER=root@servidor SCREEN_SSH_PORT=3013 npm run apk:publish
```

El APK queda en `https://<panel>/apk` (sin login; también `/screentv.apk` y en el host de la TV).
El panel muestra el botón "Descargar APK" en Ajustes y en Pantallas, y la web de la TV ofrece
la descarga en la pantalla del código. `SCREEN_STACK_DIR` cambia la carpeta del servidor
(por defecto `/opt/screen-platform`, el APK va en `apk/`).

## Actualizaciones en vivo (sin reinstalar el APK)

La app comprueba al arrancar, y cada 6 horas, `https://api.<dominio>:<puerto>/updates/latest.json`.
Ese archivo y el paquete `tv-<commit>.zip` los genera `deploy/Dockerfile.web` en cada push a
`main` (GitHub Actions pasa el commit como `BUNDLE_VERSION`) y los sirve Caddy desde el host del
API. Si la versión publicada no es la que la app está ejecutando, descarga el paquete y se
reinicia con él: un par de segundos de pantalla negra, una vez por actualización.

- Cambios en `src/` (interfaz, lógica): solo `git push`. Las TVs se actualizan solas.
- Cambios nativos (plugins de Capacitor, manifest, versión de Capacitor): hace falta un APK
  nuevo con `npm run apk`. Plugins actuales: Filesystem, Preferences, App (botón Atrás del
  control: sale del modo reproducción en vez de cerrar la app; APKs anteriores a la 1.6 no lo
  tienen) y capacitor-updater.
- `android-config/MainActivity.java` (aplicado por `npm run android:setup`) sirve los videos
  descargados con soporte real de rangos HTTP. Sin él, el WebView congela los videos grandes
  (más de unos MB) tras el primer fotograma porque la respuesta por defecto de Capacitor a un
  `Range` devuelve el archivo desde el byte 0. Requiere APK 1.7 o superior. Al instalarlo, el plugin vuelve al paquete integrado en el APK y
  sigue actualizándose desde ahí.
- `npm run apk` sella el commit actual en el APK (`VITE_BUNDLE_VERSION`). Genera el APK desde un
  commit ya subido; si no, la app verá una versión distinta en el servidor y se "actualizará"
  a la del servidor en el primer arranque.
- Implementación: `src/hooks/useLiveUpdate.ts` con el plugin de código abierto
  `@capgo/capacitor-updater` en modo manual, sin servicios externos.
