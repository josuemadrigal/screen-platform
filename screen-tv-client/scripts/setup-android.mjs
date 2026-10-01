// Re-applies our Android customizations after `npx cap add android` regenerates the folder:
//  - Android TV manifest (leanback launcher, banner, optional touchscreen) + banner image
//  - MainActivity that serves downloaded videos with proper HTTP range support
//  - compileSdk/targetSdk 35 and a newer Android Gradle Plugin (required by @capgo/capacitor-updater)
// Usage: npm run android:setup
import { readFileSync, writeFileSync, copyFileSync, cpSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const android = join(root, 'android')
if (!existsSync(android)) {
  console.error('No android/ folder. Run: npx cap add android')
  process.exit(1)
}

// Manifest + banner
copyFileSync(join(root, 'android-config/AndroidManifest.xml'), join(android, 'app/src/main/AndroidManifest.xml'))
// Every resource under android-config/res (TV banner, launcher icons in all densities)
cpSync(join(root, 'android-config/res'), join(android, 'app/src/main/res'), { recursive: true })

// MainActivity with HTTP range support for the downloaded videos (large files froze otherwise)
copyFileSync(join(root, 'android-config/MainActivity.java'), join(android, 'app/src/main/java/com/screenmanager/tvclient/MainActivity.java'))

// SDK 35 + AGP 8.7 + Gradle 8.9
const patch = (file, edits) => {
  let s = readFileSync(file, 'utf8')
  for (const [re, to] of edits) s = s.replace(re, to)
  writeFileSync(file, s)
}
patch(join(android, 'variables.gradle'), [
  [/minSdkVersion = \d+/, 'minSdkVersion = 23'], // play-services (via the updater) needs Android 6+
  [/compileSdkVersion = \d+/, 'compileSdkVersion = 35'],
  [/targetSdkVersion = \d+/, 'targetSdkVersion = 35'],
])
patch(join(android, 'build.gradle'), [[/com\.android\.tools\.build:gradle:[\d.]+/, 'com.android.tools.build:gradle:8.7.2']])
patch(join(android, 'gradle/wrapper/gradle-wrapper.properties'), [[/gradle-[\d.]+-all\.zip/, 'gradle-8.9-all.zip']])

// Release build: TV ABIs only, R8 minified, signed with the debug keystore (see BUILD.md)
patch(join(android, 'app/build.gradle'), [
  [/    buildTypes \{\n        release \{\n            minifyEnabled false/, `    signingConfigs {
        release {
            storeFile file(System.getProperty("user.home") + "/.android/debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true`],
  [/(    defaultConfig \{\n)/, `$1        ndk { abiFilters 'arm64-v8a', 'armeabi-v7a' }\n`],
])

console.log('Android project configured: TV manifest, banner, launcher icons, MainActivity (range), minSdk 23, SDK 35, AGP 8.7.2, Gradle 8.9')
