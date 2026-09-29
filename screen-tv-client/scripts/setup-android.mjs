// Re-applies our Android customizations after `npx cap add android` regenerates the folder:
//  - Android TV manifest (leanback launcher, banner, optional touchscreen) + banner image
//  - compileSdk/targetSdk 35 and a newer Android Gradle Plugin (required by @capgo/capacitor-updater)
// Usage: npm run android:setup
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
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
mkdirSync(join(android, 'app/src/main/res/drawable'), { recursive: true })
copyFileSync(join(root, 'android-config/res/drawable/tv_banner.png'), join(android, 'app/src/main/res/drawable/tv_banner.png'))

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

console.log('Android project configured: TV manifest, banner, minSdk 23, SDK 35, AGP 8.7.2, Gradle 8.9')
