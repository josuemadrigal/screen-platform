import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Smartphone, Download, Tv } from 'lucide-react'
import { APK_URL, APK_VERSION_URL } from '../lib/config'

interface ApkInfo {
  version: string
  code: number
  size: number
  commit?: string
  publishedAt?: string
  file: string
}

/** Public, login-free short URL (Caddy redirects /apk to the file). */
const shortUrl = () => `${window.location.host}/apk`

export const useApkInfo = () =>
  useQuery({
    queryKey: ['apk-info'],
    queryFn: async () => {
      try {
        return (await axios.get<ApkInfo>(APK_VERSION_URL)).data
      } catch {
        return null // not published yet
      }
    },
    staleTime: 60_000,
  })

export function ApkDownloadCard() {
  const { data: info, isLoading } = useApkInfo()
  const mb = info ? (info.size / 1024 / 1024).toFixed(1) : null
  const date = info?.publishedAt ? new Date(info.publishedAt).toLocaleDateString() : null

  return (
    <div className="glass p-8 rounded-[32px] space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <Smartphone size={20} className="text-primary" />
        Aplicación para Android TV
      </h3>

      {isLoading ? (
        <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
      ) : info ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-400 space-y-1">
            <p>
              Versión <span className="text-white font-bold">{info.version}</span>
              <span className="text-slate-500"> · {mb} MB{date ? ` · publicada el ${date}` : ''}</span>
            </p>
            <p className="flex items-center gap-2">
              <Tv size={14} />
              En el navegador de la TV abre <span className="font-mono text-white">{shortUrl()}</span>
            </p>
          </div>
          <a
            href={APK_URL}
            download="screentv.apk"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            <Download size={18} />
            Descargar APK
          </a>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          Todavía no hay un APK publicado. Desde tu computadora, en <span className="font-mono text-white">screen-tv-client</span>, ejecuta
          <span className="font-mono text-white"> npm run apk</span> y luego <span className="font-mono text-white">npm run apk:publish</span>.
        </p>
      )}
    </div>
  )
}
