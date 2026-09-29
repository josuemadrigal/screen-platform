/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  /** Version of this web bundle (git sha); set at build time, compared with the server's latest.json */
  readonly VITE_BUNDLE_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
