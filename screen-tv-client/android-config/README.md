# Android project configuration

The `android/` folder is generated (`npx cap add android`) and not committed. After generating
it, apply our customizations with one command:

```bash
npx cap add android      # only if android/ does not exist yet
npm run android:setup    # TV manifest + banner, SDK 35, AGP 8.7.2, Gradle 8.9, ARM-only minified release
```

What it applies:

- `AndroidManifest.xml`: `LEANBACK_LAUNCHER` category, `android:banner` (320x180) for the
  Android TV home screen, `uses-feature` entries marking leanback and touchscreen as optional.
- `minSdk` 23 (Android 6+), `compileSdk`/`targetSdk` 35 and Android Gradle Plugin 8.7.2 with Gradle 8.9: required by
  `@capgo/capacitor-updater` (live updates). Capacitor 6 generates SDK 34, which fails to build.

- Release build type: R8 minification, resource shrinking, ARM ABIs only, signed with the local
  debug keystore so it installs over earlier builds (see `BUILD.md`).

Then build with `npm run apk` (see `BUILD.md`).
