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
