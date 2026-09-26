/**
 * Runtime configuration.
 *
 * In production Caddy serves /config.js with the real API URL, so the same Docker image
 * works for any domain. In development the file in public/ is empty and the Vite env
 * variables (or localhost) are used instead.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: { apiUrl?: string; socketUrl?: string }
  }
}

const runtime = typeof window !== 'undefined' ? window.__APP_CONFIG__ || {} : {}

export const API_URL: string =
  runtime.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:4006'

export const SOCKET_URL: string =
  runtime.socketUrl || import.meta.env.VITE_SOCKET_URL || API_URL
