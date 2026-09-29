/**
 * Runtime configuration.
 *
 * Where the API URL comes from, in order:
 *  1. /config.js served by Caddy (web deployment; the same image works for any domain).
 *  2. VITE_API_URL baked at build time (the APK's built-in bundle, `npm run apk`).
 *  3. The value the app stored on a previous run. Live-update bundles are built by CI without
 *     a domain, so they rely on this: the APK writes the URL once, updates inherit it.
 *  4. localhost, for local development.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: { apiUrl?: string; socketUrl?: string }
  }
}

const STORAGE_KEY = 'screentv.apiUrl'
const STORAGE_KEY_SOCKET = 'screentv.socketUrl'

const runtime = typeof window !== 'undefined' ? window.__APP_CONFIG__ || {} : {}

const readStored = (key: string): string | undefined => {
  try {
    return localStorage.getItem(key) || undefined
  } catch {
    return undefined
  }
}

const baked = import.meta.env.VITE_API_URL || undefined
const bakedSocket = import.meta.env.VITE_SOCKET_URL || undefined

export const API_URL: string =
  runtime.apiUrl || baked || readStored(STORAGE_KEY) || 'http://localhost:4006'

export const SOCKET_URL: string =
  runtime.socketUrl || bakedSocket || readStored(STORAGE_KEY_SOCKET) || API_URL

/** Persist the resolved URLs so a live-updated bundle (built without them) keeps working. */
export function rememberApiUrl(): void {
  try {
    localStorage.setItem(STORAGE_KEY, API_URL)
    localStorage.setItem(STORAGE_KEY_SOCKET, SOCKET_URL)
  } catch {
    /* storage unavailable */
  }
}

rememberApiUrl()
