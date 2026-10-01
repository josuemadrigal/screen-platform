import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'
import { useScreen } from '../hooks/useScreen'
import { useSQLiteCache } from '../hooks/useSQLiteCache'
import { useVideoStore } from '../hooks/useVideoStore'
import { useLiveUpdate } from '../hooks/useLiveUpdate'
import { Cast, AlertCircle, XCircle, Wifi, WifiOff, Tv2, Download, HardDrive } from 'lucide-react'
import { cn } from '../lib/utils'
import { API_URL } from '../lib/config'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoData {
  id: number
  path: string
  title?: string
  thumbnail?: string
  dateout?: string | null
}

// Short git sha stamped at build time (see useLiveUpdate); 'dev' when running locally.
const BUNDLE_VERSION = (import.meta.env.VITE_BUNDLE_VERSION || 'dev').slice(0, 7)

// ─── Caducidad ────────────────────────────────────────────────────────────────
// The server drops expired videos from the playlist every night, but the TV only refreshes
// on reload. Filter locally as well, by the device's date, so expiry also works offline.
const todayLocal = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const isVideoActive = (v: VideoData) => !v.dateout || v.dateout >= todayLocal()
const msUntilNextMidnight = () => {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
  return next.getTime() - now.getTime()
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ClientPage() {
  // Native app: fetch and apply web bundle updates published by the server.
  const updateStatus = useLiveUpdate()
  const [screenCode, setScreenCode] = useState('')
  const [linkedCode, setLinkedCode] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoList, setVideoList] = useState<VideoData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerText, setBannerText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  // Sonido apagado para esta pantalla (se configura en el panel y llega en vivo por socket).
  const [screenMuted, setScreenMuted] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)

  // ─── Double buffering para transiciones sin cortes ─────────────────────────
  const [activePlayer, setActivePlayer] = useState(0)
  const videoRef0 = useRef<HTMLVideoElement>(null)
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const refs = [videoRef0, videoRef1]

  // Android WebView pinta su propio "poster" (un ▶ enorme sobre blanco) en cualquier <video>
  // sin atributo poster que no esté reproduciendo. Un poster transparente lo anula y deja ver
  // la capa de espera con el logo.
  const TRANSPARENT_POSTER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%229%22/%3E'

  // En la TV, dos videos descodificando a la vez (el activo y el siguiente precargando) pueden
  // trabar al activo. El inactivo solo carga metadatos y se "calienta" 5 s antes del cambio.
  const warmedRef = useRef<string>('')
  const warmNext = useCallback(() => {
    const active = refs[activePlayer].current
    const next = refs[(activePlayer + 1) % 2].current
    if (!active || !next || !next.src || !Number.isFinite(active.duration)) return
    if (active.duration - active.currentTime > 5 || warmedRef.current === next.src) return
    warmedRef.current = next.src
    next.preload = 'auto'
    next.load()
  }, [activePlayer])

  // play() puede ser rechazado por el WebView (política de autoplay, decodificador ocupado).
  // Reintentar en silencio evita que el elemento quede en pausa mostrando un hueco.
  const safePlay = useCallback((el: HTMLVideoElement | null | undefined) => {
    if (!el) return
    el.play().catch(() => {
      el.muted = true
      el.play().catch(() => { })
    })
  }, [])

  // ─── Refs / Hooks ──────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeCode = linkedCode || 'GENERIC'
  const { socket, isConnected } = useScreen({ screenName: isRegistered ? activeCode : undefined })
  const cache = useSQLiteCache()
  // Native app: videos are downloaded once to the device and played from disk.
  const store = useVideoStore()
  const servidor = API_URL

  const currentVideo = videoList[currentIndex]
  // Siguiente video a reproducir. En la app, mientras haya descargas pendientes, la rotación
  // se limita a los videos ya guardados en disco: al terminar uno no se espera por otro que
  // aún se está descargando, se sigue con el siguiente disponible. Con todos descargados (o
  // ninguno todavía) se respeta el orden de la playlist. store.version re-evalúa esto.
  const nextIndex = (() => {
    const n = videoList.length
    if (n === 0) return 0
    const locals = videoList.map((v) => store.isLocal(v.path))
    const restrictToLocal = store.isNative && locals.some(Boolean) && !locals.every(Boolean)
    for (let k = 1; k <= n; k++) {
      const i = (currentIndex + k) % n
      if (!restrictToLocal || locals[i]) return i
    }
    return (currentIndex + 1) % n
  })()
  void store.version

  // Source of each player slot. Resolved when the slot is assigned a video (local file if
  // already downloaded, API otherwise) and kept until the slot changes, so a finished
  // download never interrupts the video that is playing.
  const [srcs, setSrcs] = useState<[string, string]>(['', ''])
  useEffect(() => {
    if (videoList.length === 0) {
      setSrcs(['', ''])
      return
    }
    const v0 = videoList[activePlayer === 0 ? currentIndex : nextIndex]
    const v1 = videoList[activePlayer === 1 ? currentIndex : nextIndex]
    const next: [string, string] = [
      v0 ? store.resolveSrc(v0.path, servidor) : '',
      v1 ? store.resolveSrc(v1.path, servidor) : '',
    ]
    setSrcs((prev) => {
      // Once a local copy lands (store.version), the inactive player switches to it right away.
      // The active one keeps streaming what it is playing, unless that source has failed.
      const keepActive = (slot: 0 | 1) => {
        const el = refs[slot].current
        const same = prev[slot] && prev[slot].endsWith(next[slot].split('/').pop() || '\0')
        return slot === activePlayer && same && prev[slot] !== next[slot] && el && !el.error
      }
      const out: [string, string] = [keepActive(0) ? prev[0] : next[0], keepActive(1) ? prev[1] : next[1]]
      // Only update when something actually changed, so React does not re-render in a loop.
      return prev[0] === out[0] && prev[1] === out[1] ? prev : out
    })
  }, [videoList, currentIndex, activePlayer, nextIndex, store.resolveSrc, store.version, servidor])

  // ─── Fetch desde API + cache offline ──────────────────────────────────────
  const fetchScreenData = useCallback(async (code: string): Promise<boolean> => {
    const codeToUse = code || 'GENERIC'
    setError(null)
    try {
      const { data } = await api.get(`/screens/code/${codeToUse}`)
      if (data?.videosData) {
        const active = (data.videosData as VideoData[]).filter(isVideoActive)
        setScreenMuted(!!data.muted)
        setVideoList(active)
        setLinkedCode(codeToUse)
        setIsRegistered(true)
        setIsOffline(false)
        await cache.saveScreenCode(codeToUse)
        await cache.cacheVideos(codeToUse, data.videosData)
        // Fire and forget: downloads missing videos in the background, deletes unused ones.
        store.sync(active, servidor)
        return true
      }
      return false
    } catch (err) {
      console.warn('[TV] Sin conexión, intentando cache SQLite...')
      // Intentar cargar desde cache SQLite
      const cachedVideos = (await cache.getCachedVideos(codeToUse)).filter(isVideoActive)
      if (cachedVideos.length > 0) {
        setVideoList(cachedVideos)
        setLinkedCode(codeToUse)
        setIsRegistered(true)
        setIsOffline(true)
        return true
      }
      setError('Sin conexión y sin datos en caché.')
      return false
    }
  }, [cache, store, servidor])

  // En el navegador (no en la app) ofrecemos descargar el APK si el servidor lo publica.
  const [apkVersion, setApkVersion] = useState<string | null>(null)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    fetch('/apk/version.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => setApkVersion(info?.version ?? null))
      .catch(() => {})
  }, [])

  // ─── Inicialización: leer código guardado ──────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingInit(true)
      const savedCode = await cache.loadScreenCode()
      if (savedCode) {
        const ok = await fetchScreenData(savedCode)
        if (ok) {
          // En TV: ir directo a fullscreen si ya estaba configurado
          setTimeout(() => enterFullscreen(), 500)
        }
      }
      setLoadingInit(false)
    }
    // Wait for the local video index too, so the first video already plays from disk when present.
    if (cache.isReady && store.isReady) init()
  }, [cache.isReady, store.isReady])

  // ─── Caducidad a medianoche: quitar de la lista los videos que vencen hoy ──────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        setVideoList((prev) => {
          const next = prev.filter(isVideoActive)
          if (next.length !== prev.length) console.log(`[TV] ${prev.length - next.length} video(s) vencido(s) retirado(s)`)
          return next
        })
        schedule()
      }, msUntilNextMidnight())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  // Keep the index valid when the list shrinks.
  useEffect(() => {
    if (videoList.length > 0 && currentIndex >= videoList.length) setCurrentIndex(0)
  }, [videoList.length, currentIndex])

  // ─── Fullscreen helpers ────────────────────────────────────────────────────
  // "isFullscreen" es el modo reproducción de la app, no el estado del navegador. La API
  // Fullscreen solo funciona tras una pulsación del usuario, así que después de una recarga
  // (comando del panel, actualización en vivo) Android la rechaza; el modo debe entrar igual.
  const historyPushed = useRef(false)
  const leavePlayback = () => {
    setIsFullscreen(false)
    if (historyPushed.current) {
      historyPushed.current = false
      window.history.back()
    }
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      const exit = document.exitFullscreen?.bind(document) ?? (document as any).webkitExitFullscreen?.bind(document)
      exit?.().catch?.(() => { })
    }
  }

  // Botón Atrás en la app Android: Capacitor no lo gestiona sin el plugin App (la actividad se
  // cierra). Con el plugin: en modo reproducción vuelve a la pantalla del código; en la pantalla
  // del código cierra la app. APKs antiguos sin el plugin siguen con el comportamiento anterior.
  const isFullscreenRef = useRef(false)
  isFullscreenRef.current = isFullscreen
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) return
    const sub = CapApp.addListener('backButton', () => {
      if (isFullscreenRef.current) leavePlayback()
      else CapApp.exitApp()
    })
    return () => { sub.then((h) => h.remove()) }
  }, [])

  // Botón Atrás del control: Android cierra la app si el WebView no tiene historial. Al entrar en
  // modo reproducción se añade una entrada; Atrás la saca (popstate) y volvemos a la pantalla del
  // código en lugar de salir de la app.
  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true)
    if (!historyPushed.current) {
      historyPushed.current = true
      window.history.pushState({ tvPlayback: true }, '')
    }
    try {
      const elem = document.documentElement as any
      if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
        if (elem.requestFullscreen) await elem.requestFullscreen()
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen()
      }
    } catch (err) {
      console.warn('[TV] Fullscreen del navegador no disponible (se sigue en modo reproducción):', err)
    }
  }, [])

  useEffect(() => {
    const handleFSChange = () => {
      // Salir de la pantalla completa del navegador (Escape) abandona el modo reproducción.
      const active = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      if (!active) leavePlayback()
    }
    const handlePopState = () => {
      // Atrás en el control (o en el navegador): salir del modo reproducción.
      historyPushed.current = false
      setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    document.addEventListener('webkitfullscreenchange', handleFSChange)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange)
      document.removeEventListener('webkitfullscreenchange', handleFSChange)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    setHasInteracted(true)
    if (!isFullscreen) {
      await enterFullscreen()
      return
    }
    leavePlayback()
  }, [isFullscreen, enterFullscreen])

  // ─── Formulario de vinculación ─────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasInteracted(true)
    if (isRegistered && !screenCode) {
      toggleFullscreen()
      return
    }
    const success = await fetchScreenData(screenCode)
    // enterFullscreen is idempotent: a second call never exits fullscreen.
    if (success) enterFullscreen()
  }

  // ─── Desvincular ──────────────────────────────────────────────────────────
  const handleUnlink = async () => {
    await cache.clearScreenCode()
    setIsRegistered(false)
    setVideoList([])
    setLinkedCode('')
    setScreenCode('')
  }

  // ─── Navegación entre videos ───────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (videoList.length <= 1) {
      const activeRef = refs[activePlayer]
      if (activeRef.current) {
        activeRef.current.currentTime = 0
        safePlay(activeRef.current)
      }
      return
    }
    const nextPlayer = (activePlayer + 1) % 2
    setActivePlayer(nextPlayer)
    setCurrentIndex(nextIndex)
    setTimeout(() => safePlay(refs[nextPlayer].current), 10)
  }, [videoList, activePlayer, nextIndex, safePlay])

  // ─── Soporte Control Remoto / D-pad ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter inside the code field or on a button belongs to the form (it submits and goes
      // fullscreen itself). Handling it here too toggled fullscreen twice: on, then off.
      const tag = (e.target as HTMLElement | null)?.tagName
      const inFormField = tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA'
      switch (e.keyCode) {
        case 13:  // Enter / OK — entrar en fullscreen o confirmar
        case 179: // Play/Pause (Media key)
          if (e.keyCode === 13 && inFormField) break
          if (!isFullscreen && isRegistered) {
            toggleFullscreen()
          } else if (isFullscreen) {
            setIsPlaying(prev => !prev)
          }
          break
        case 37: // ← Anterior
          if (isFullscreen) {
            setCurrentIndex(prev => (prev - 1 + videoList.length) % videoList.length)
          }
          break
        case 39: // → Siguiente
          if (isFullscreen) handleNext()
          break
        case 27: // Escape — salir de fullscreen
          // Android TV gestiona el botón Back automáticamente
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, isRegistered, videoList, handleNext, toggleFullscreen, enterFullscreen])

  // ─── Auto-enfocar input en formulario ─────────────────────────────────────
  useEffect(() => {
    if (!isFullscreen && !loadingInit) {
      inputRef.current?.focus()
    }
  }, [isFullscreen, loadingInit])

  // ─── Desbloquear audio en primera interacción ──────────────────────────────
  useEffect(() => {
    if (hasInteracted) {
      refs[activePlayer].current?.play().catch(() => { })
    }
  }, [hasInteracted, activePlayer])

  // ─── Emitir estado de reproducción al manager ──────────────────────────────
  useEffect(() => {
    if (socket && videoList.length > 0) {
      socket.emit('update-screen-status', {
        playbackStatus: isPlaying ? 'playing' : 'paused',
        currentVideo: currentVideo
          ? { id: currentVideo.id, title: currentVideo.title, thumbnail: currentVideo.thumbnail }
          : null,
      })
    }
  }, [isPlaying, currentIndex, socket, videoList.length])

  // ─── Comandos remotos desde el panel admin ────────────────────────────────
  useEffect(() => {
    if (!socket) return

    socket.on('control-screen', (data: { action: string; data?: any }) => {
      const { action, data: actionData } = data
      const activeRef = refs[activePlayer]
      switch (action) {
        case 'play':
          setIsPlaying(true)
          activeRef.current?.play()
          break
        case 'pause':
          setIsPlaying(false)
          activeRef.current?.pause()
          break
        case 'stop':
          setIsPlaying(false)
          if (activeRef.current) {
            activeRef.current.pause()
            activeRef.current.currentTime = 0
          }
          break
        case 'reload-screen':
          // Recargar la playlist sin reiniciar la página: la TV sigue en modo reproducción.
          fetchScreenData(linkedCode).then((ok) => {
            if (!ok) return
            setCurrentIndex(0)
            setActivePlayer(0)
            setIsPlaying(true)
            setTimeout(() => safePlay(refs[0].current), 50)
          })
          break
        case 'toggle-fullscreen':
          // El modo reproducción es propio de la app, así que el comando remoto siempre funciona.
          toggleFullscreen()
          break
        case 'change-video':
          if (actionData?.direction === 'next') handleNext()
          else setCurrentIndex(prev => (prev - 1 + videoList.length) % videoList.length)
          break
        case 'show-banner':
          setBannerText(actionData?.text || '')
          setShowBanner(!!actionData?.text)
          break
        case 'set-muted':
          setScreenMuted(!!actionData?.muted)
          break
      }
    })

    return () => {
      socket.off('control-screen')
    }
  }, [socket, videoList, activePlayer, handleNext, toggleFullscreen, fetchScreenData, linkedCode, safePlay])

  // ─── Reanudar reproducción ────────────────────────────────────────────────
  // Android pauses the video when the app goes to the background or the screen turns off,
  // and does not resume it. Resume when we come back, and keep a watchdog for any other
  // silent pause (decoder hiccup, blocked play() promise, etc.).
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'visible' || !isPlaying) return
      refs[activePlayer].current?.play().catch(() => { })
    }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('focus', resume)
    return () => {
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('focus', resume)
    }
  }, [isPlaying, activePlayer])

  // La capa de espera (logo) solo se muestra ante un fallo real: el video activo lleva más de
  // 2 s sin datos. Nunca durante el cambio normal entre videos, que en Android tarda unas
  // décimas en pintar el primer fotograma.
  const [standby, setStandby] = useState(false)
  const stalledSince = useRef<number | null>(null)
  const stallReported = useRef(false)
  useEffect(() => {
    if (!isRegistered || videoList.length === 0) return
    const tick = setInterval(() => {
      const el = refs[activePlayer].current
      if (!el || !isPlaying || document.visibilityState !== 'visible') return
      if (el.readyState >= 2 && !el.error) {
        stalledSince.current = null
        stallReported.current = false
        setStandby(false)
        if (el.paused && !el.ended) el.play().catch(() => { })
        return
      }
      stalledSince.current ??= Date.now()
      const stalledFor = Date.now() - stalledSince.current
      if (stalledFor > 2000) setStandby(true)
      // Report the stall once to the server so it shows up in the API logs with the details
      // needed to diagnose it (source, buffer, decoder state) without touching the TV.
      if (stalledFor > 2000 && !stallReported.current) {
        stallReported.current = true
        const ranges: string[] = []
        for (let i = 0; i < el.buffered.length; i++) ranges.push(`${el.buffered.start(i).toFixed(1)}-${el.buffered.end(i).toFixed(1)}`)
        socket?.emit('update-screen-status', {
          stall: {
            src: el.currentSrc.split('/').pop(),
            local: el.currentSrc.includes('_capacitor_file_'),
            readyState: el.readyState,
            networkState: el.networkState,
            error: el.error?.code ?? null,
            currentTime: Number(el.currentTime.toFixed(1)),
            duration: Number.isFinite(el.duration) ? Number(el.duration.toFixed(1)) : null,
            buffered: ranges.join(','),
            paused: el.paused,
            bundle: BUNDLE_VERSION,
          },
        })
      }
      // No data for this source: give it 20 s, then move on so the screen never freezes.
      if (stalledFor > 20000) {
        console.warn('[TV] Video sin datos durante 20 s, saltando al siguiente')
        stalledSince.current = null
        handleNext()
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [isRegistered, videoList.length, activePlayer, isPlaying, handleNext])

  // A source that fails to load: if it was the local copy, drop it and fall back to the API.
  const retried = useRef<Record<string, number>>({})
  const handleVideoError = useCallback((slot: 0 | 1) => {
    const video = videoList[slot === activePlayer ? currentIndex : nextIndex]
    const el = refs[slot].current
    console.warn('[TV] Error de reproducción en', el?.currentSrc, el?.error?.code)
    if (video && store.isLocal(video.path)) {
      store.discard(video.path)
      setSrcs((prev) => {
        const next: [string, string] = [...prev] as [string, string]
        next[slot] = `${servidor}${video.path}`
        return next
      })
      return
    }
    // Streaming source failed (network blip, playlist just changed...). Retry it once after a
    // moment; a local copy may also have landed meanwhile and take over via store.version.
    const key = el?.currentSrc || ''
    const attempts = (retried.current[key] || 0) + 1
    retried.current[key] = attempts
    if (attempts <= 1 && el) {
      setTimeout(() => {
        if (!el.error) return
        el.load()
        if (slot === activePlayer) safePlay(el)
      }, 2000)
      return
    }
    if (slot === activePlayer) setTimeout(() => handleNext(), 3000)
  }, [videoList, activePlayer, currentIndex, nextIndex, store, servidor, handleNext, safePlay])

  // ─── Screenshot periódico ──────────────────────────────────────────────────
  const takeScreenshot = () => {
    const activeRef = refs[activePlayer]
    if (activeRef.current && activeRef.current.readyState >= 2) {
      const canvas = document.createElement('canvas')
      const ratio = activeRef.current.videoWidth / activeRef.current.videoHeight || 16 / 9
      canvas.width = 320
      canvas.height = Math.round(320 / ratio)
      try {
        canvas.getContext('2d')?.drawImage(activeRef.current, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.4)
      } catch { return null }
    }
    return null
  }

  useEffect(() => {
    if (!socket || !isRegistered || videoList.length === 0) return
    const interval = setInterval(() => {
      const shot = takeScreenshot()
      if (shot) socket.emit('update-screen-status', { screenshot: shot })
    }, 30000)
    return () => clearInterval(interval)
  }, [socket, isRegistered, videoList.length, activePlayer])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Tv2 size={72} className="text-indigo-400 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <span className="size-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
            <span className="size-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
            <span className="size-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-slate-500 text-sm tracking-widest uppercase">Iniciando Screen TV…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={() => setHasInteracted(true)}
      className={cn(
        'min-h-screen bg-[#000000] text-white font-sans relative overflow-hidden flex items-center justify-center',
        // Fuera de pantalla completa: vista previa a la izquierda y formulario a la derecha en
        // pantallas anchas (TV, escritorio); apilados en pantallas estrechas.
        !isFullscreen && 'flex-col md:flex-row gap-8 md:gap-10 lg:gap-14 px-6 py-8'
      )}
    >
      {/* ── CAPA DE VIDEO (doble buffer, nunca se destruye) ── */}
      <div className={cn(
        'transition-all duration-700 ease-in-out bg-black overflow-hidden shadow-2xl',
        isFullscreen
          ? 'fixed inset-0 z-100'
          : 'relative w-full max-w-3xl md:max-w-none md:flex-1 md:basis-0 aspect-video rounded-[32px] border-4 border-white/5 z-0'
      )}>
        {/* Capa de espera: solo ante un fallo real (ver `standby`), nunca en el cambio entre videos. */}
        <div className={cn('absolute inset-0 z-0 flex-col items-center justify-center gap-6 bg-[#000000]', standby ? 'flex' : 'hidden')}>
          <img src="/icon-512.png" alt="2B Screen" className="w-36 h-36 rounded-[28px] drop-shadow-2xl animate-[breathe_2.4s_ease-in-out_infinite]" draggable={false} />
          <div className="flex items-center gap-3 text-white/70">
            <span className="size-5 rounded-full border-2 border-white/20 border-t-indigo-400 animate-spin" />
            <span className="text-xl font-bold tracking-[0.2em] uppercase">
              {store.progress
                ? `Descargando videos ${Math.min(store.progress.done + 1, store.progress.total)}/${store.progress.total}`
                : 'Cargando'}
              <span className="animate-[dots_1.5s_steps(4,end)_infinite]">…</span>
            </span>
          </div>
        </div>

        {videoList.length > 0 ? (
          <>
            <video
              ref={videoRef0}
              src={srcs[0]}
              // Sin fundido: el saliente queda debajo con su último fotograma hasta que el
              // entrante pinta, así nunca se ve la capa de espera entre videos.
              className={cn('absolute inset-0 w-full h-full object-cover', activePlayer === 0 ? 'z-10' : 'z-[1]')}
              autoPlay={activePlayer === 0 && isPlaying}
              muted={activePlayer !== 0 || !hasInteracted || screenMuted}
              onEnded={() => activePlayer === 0 && handleNext()}
              onPlaying={() => activePlayer === 0 && setStandby(false)}
              onTimeUpdate={() => activePlayer === 0 && store.isNative && warmNext()}
              onError={() => handleVideoError(0)}
              preload={store.isNative && activePlayer !== 0 ? 'metadata' : 'auto'}
              poster={TRANSPARENT_POSTER}
              playsInline
            />
            <video
              ref={videoRef1}
              src={srcs[1]}
              className={cn('absolute inset-0 w-full h-full object-cover', activePlayer === 1 ? 'z-10' : 'z-[1]')}
              autoPlay={activePlayer === 1 && isPlaying}
              muted={activePlayer !== 1 || !hasInteracted || screenMuted}
              onEnded={() => activePlayer === 1 && handleNext()}
              onPlaying={() => activePlayer === 1 && setStandby(false)}
              onTimeUpdate={() => activePlayer === 1 && store.isNative && warmNext()}
              onError={() => handleVideoError(1)}
              preload={store.isNative && activePlayer !== 1 ? 'metadata' : 'auto'}
              poster={TRANSPARENT_POSTER}
              playsInline
            />
          </>
        ) : (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#000000]">
            <img src="/icon-512.png" alt="2B Screen" className="w-40 h-40 rounded-[28px] mb-6" draggable={false} />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-500">Esperando contenido</span>
          </div>
        )}

        {/* Badge estado en modo preview */}
        {!isFullscreen && (
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            {/* Live badge */}
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                LIVE: <span className="text-red-400">{activeCode}</span>
              </span>
            </div>
            {/* Estado de conexión */}
            <div className={cn(
              'bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border flex items-center gap-2 shadow-xl text-[10px] font-black uppercase tracking-widest',
              isConnected ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
            )}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? 'Conectado' : 'Sin conexión'}
            </div>
            {/* Descarga de videos al dispositivo (solo app nativa) */}
            {store.progress && (
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-500/30 text-indigo-300 flex items-center gap-2 shadow-xl text-[10px] font-black uppercase tracking-widest">
                <Download size={10} className="animate-bounce" />
                Descargando {Math.min(store.progress.done + 1, store.progress.total)}/{store.progress.total}
              </div>
            )}
            {/* Reproduciendo desde el almacenamiento de la TV */}
            {store.isNative && !store.progress && currentVideo && store.isLocal(currentVideo.path) && (
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-slate-400 flex items-center gap-2 shadow-xl text-[10px] font-black uppercase tracking-widest">
                <HardDrive size={10} />
                Local
              </div>
            )}
            {/* Badge offline cache */}
            {isOffline && (
              <div className="bg-amber-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                ⚡ Modo Offline
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FORMULARIO (solo visible fuera de fullscreen) ── */}
      {!isFullscreen && (
        <div className="z-10 w-full max-w-xl md:max-w-none md:flex-1 md:basis-0 md:px-4 lg:px-6 xl:px-16 space-y-6 animate-[fadeSlideUp_0.6s_ease_forwards]">
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-3xl bg-white mb-1 shadow-2xl">
              <img src="/logo.png" alt="2B Screen" className="h-16 w-auto object-contain" draggable={false} />
            </div>
            {screenMuted && (
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Sonido apagado desde el panel</p>
            )}
            <p className="text-slate-400 text-base font-medium">
              {isRegistered
                ? `Vinculado como ${linkedCode}.`
                : 'Ingresa el código para comenzar.'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={screenCode}
              onChange={(e) => setScreenCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO DE PANTALLA"
              autoComplete="off"
              className="w-full bg-white/5 border-2 border-white/10 rounded-3xl py-6 px-6
                         text-xl lg:text-2xl font-black tracking-[0.15em] lg:tracking-[0.25em] text-center
                         focus:outline-none focus:border-red-500 transition-all
                         shadow-2xl placeholder:text-white/20"
            />

            {error && (
              <div className="text-red-400 bg-red-400/10 p-4 rounded-2xl border border-red-400/20 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-[#d01f27] hover:bg-[#b91c22] text-white font-black py-5 rounded-3xl
                           flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl
                           uppercase tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <Cast size={24} />
                {isRegistered ? 'Pantalla Completa' : 'Vincular'}
              </button>
              {isRegistered && (
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="p-5 rounded-3xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all
                             border border-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Desvincular pantalla"
                >
                  <XCircle size={24} />
                </button>
              )}
            </div>
          </form>

          {apkVersion && (
            <a
              href="/apk"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Download size={16} />
              Descargar la app para Android TV (v{apkVersion})
            </a>
          )}

          <p className="text-center text-slate-600 text-xs tracking-widest uppercase">
            Usa el control remoto · Presiona <kbd className="bg-white/10 px-2 py-0.5 rounded">OK</kbd> para pantalla completa
          </p>
          {/* Version of the web bundle in use: changes by itself after a live update. */}
          <p className="text-center text-slate-700 text-[10px] tracking-[0.3em] uppercase">
            Interfaz {BUNDLE_VERSION}{updateStatus ? ` · ${updateStatus}` : ''}
          </p>
        </div>
      )}

      {/* ── BANNER DE MENSAJE ── */}
      {showBanner && bannerText && (
        <div className={cn(
          'fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 text-center z-110',
          'animate-[slideUp_0.5s_ease_forwards]',
          isFullscreen ? 'p-12' : 'p-6'
        )}>
          <h2 className={cn(
            'font-black text-white uppercase tracking-tight italic',
            isFullscreen ? 'text-5xl md:text-8xl' : 'text-xl md:text-2xl'
          )}>
            {bannerText}
          </h2>
        </div>
      )}
    </div>
  )
}
