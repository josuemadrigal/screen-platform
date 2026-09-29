// Increments versionCode and versionName in android/app/build.gradle so Android installs
// the new APK as an update over the previous one.
import { readFileSync, writeFileSync } from 'node:fs'
const file = new URL('../android/app/build.gradle', import.meta.url)
let gradle = readFileSync(file, 'utf8')
gradle = gradle.replace(/versionCode (\d+)/, (_, n) => `versionCode ${Number(n) + 1}`)
gradle = gradle.replace(/versionName "(\d+)\.(\d+)"/, (_, a, b) => `versionName "${a}.${Number(b) + 1}"`)
writeFileSync(file, gradle)
const [, code] = gradle.match(/versionCode (\d+)/)
const [, name] = gradle.match(/versionName "([^"]+)"/)
console.log(`Android version: ${name} (code ${code})`)
