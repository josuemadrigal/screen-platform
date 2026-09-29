# Android TV configuration

The `android/` folder is generated (`npx cap add android`) and not committed. After
generating it, copy these files over the generated ones so the app shows up on Android TV:

```bash
cp android-config/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
mkdir -p android/app/src/main/res/drawable && cp android-config/res/drawable/tv_banner.png android/app/src/main/res/drawable/
```

Then build:

```bash
# .env must point at the public API (https://api.<domain>:<port>) before building
npm run build && npx cap sync android
cd android && ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

What the manifest adds over the Capacitor default: `LEANBACK_LAUNCHER` category, the
`android:banner` (320x180) for the TV home screen, and `uses-feature` entries marking
leanback and touchscreen as optional.
