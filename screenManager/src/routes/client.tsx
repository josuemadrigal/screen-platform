import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useScreen } from '../hooks/useScreen'
import { Monitor, Cast, Play, AlertCircle, XCircle, Pause } from 'lucide-react'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/client')({
  component: ClientPage,
})

function ClientPage() {
  const [screenCode, setScreenCode] = useState('')
  const [linkedCode, setLinkedCode] = useState(localStorage.getItem('screenName') || '')
  const [isRegistered, setIsRegistered] = useState(!!localStorage.getItem('screenName'))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoList, setVideoList] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerText, setBannerText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  
  const [activePlayer, setActivePlayer] = useState(0) 
  const videoRef0 = useRef<HTMLVideoElement>(null)
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const refs = [videoRef0, videoRef1]
  const containerRef = useRef<HTMLDivElement>(null)
  
  const activeCode = linkedCode || 'GENERIC'
  const { socket } = useScreen({ screenName: activeCode })
  const servidor = import.meta.env.VITE_API_URL || 'http://localhost:4006'

  const currentVideo = videoList[currentIndex]
  const nextIndex = videoList.length > 0 ? (currentIndex + 1) % videoList.length : 0

  const fetchScreenData = async (code: string) => {
    const isDefault = !code
    const codeToUse = code || 'GENERIC'
    try {
      const { data } = await api.get(`/screens/code/${codeToUse}`)
      if (data && data.videosData) {
        setVideoList(data.videosData)
        setLinkedCode(codeToUse)
        setIsRegistered(true)
        localStorage.setItem('screenName', codeToUse)
        if (isDefault) setScreenCode('') 
        return true
      }
      return false
    } catch (err) {
      setError('Error al vincular. Verifica el código.')
      return false
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasInteracted(true)
    if (isRegistered && !screenCode) { toggleFullscreen(); return }
    const success = await fetchScreenData(screenCode)
    if (success) toggleFullscreen()
  }

  useEffect(() => {
    fetchScreenData(localStorage.getItem('screenName') || 'GENERIC')
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (socket && videoList.length > 0) {
      socket.emit('update-screen-status', { 
        playbackStatus: isPlaying ? 'playing' : 'paused',
        currentVideo: currentVideo ? { id: currentVideo.id, title: currentVideo.title, thumbnail: currentVideo.thumbnail } : null
      })
    }
  }, [isPlaying, currentIndex, socket, videoList.length])

  useEffect(() => {
    if (socket) {
      socket.on('control-screen', (data: { action: string, data?: any }) => {
        const { action, data: actionData } = data
        const activeRef = refs[activePlayer]
        switch (action) {
          case 'play': setIsPlaying(true); activeRef.current?.play(); break;
          case 'pause': setIsPlaying(false); activeRef.current?.pause(); break;
          case 'stop': 
            setIsPlaying(false); 
            if (activeRef.current) { activeRef.current.pause(); activeRef.current.currentTime = 0; }
            break;
          case 'reload-screen': window.location.reload(); break;
          case 'toggle-fullscreen': toggleFullscreen(); break;
          case 'change-video':
            if (actionData?.direction === 'next') handleNext()
            else setCurrentIndex((prev) => (prev - 1 + videoList.length) % videoList.length)
            break
          case 'show-banner':
            setBannerText(actionData?.text || '')
            setShowBanner(!!actionData?.text)
            break
        }
      })
      return () => { socket.off('control-screen') }
    }
  }, [socket, videoList, activePlayer])

  const toggleFullscreen = async () => {
    setHasInteracted(true)
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      }
    } catch (err) { console.warn('Fullscreen bloqueado:', err); }
  }

  const handleNext = () => {
    if (videoList.length <= 1) {
      const activeRef = refs[activePlayer]
      if (activeRef.current) { activeRef.current.currentTime = 0; activeRef.current.play(); }
      return
    }
    const nextPlayer = (activePlayer + 1) % 2
    setActivePlayer(nextPlayer)
    setCurrentIndex(nextIndex)
    setTimeout(() => { refs[nextPlayer].current?.play() }, 10)
  }

  const takeScreenshot = () => {
    const activeRef = refs[activePlayer]
    if (activeRef.current && activeRef.current.readyState >= 2) {
      const canvas = document.createElement('canvas')
      const ratio = activeRef.current.videoWidth / activeRef.current.videoHeight
      canvas.width = 320
      canvas.height = 320 / ratio
      const ctx = canvas.getContext('2d')
      try {
        ctx?.drawImage(activeRef.current, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.4)
      } catch (e) { return null }
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

  // Fuerza la reproducción en la primera interacción para desbloquear audio
  useEffect(() => {
    if (hasInteracted) {
      const activeRef = refs[activePlayer]
      activeRef.current?.play().catch(() => {})
    }
  }, [hasInteracted, activePlayer])

  return (
    <div ref={containerRef} onClick={() => setHasInteracted(true)} className="min-h-screen bg-[#020617] text-white font-inter flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* CAPA DE VIDEO PERSISTENTE (Esta capa no se destruye nunca) */}
      <div className={cn(
        "transition-all duration-700 ease-in-out bg-black overflow-hidden shadow-2xl",
        isFullscreen 
          ? "fixed inset-0 z-[100]" 
          : "relative w-full max-w-2xl aspect-video rounded-[40px] border-4 border-white/5 z-0"
      )}>
        {videoList.length > 0 ? (
          <>
            <video
              ref={videoRef0}
              src={`${servidor}${videoList[activePlayer === 0 ? currentIndex : nextIndex]?.path}`}
              className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-700", activePlayer === 0 ? "opacity-100 z-10" : "opacity-0 z-0")}
              autoPlay={activePlayer === 0 && isPlaying}
              // OPTIMIZACIÓN: Muted inicial para permitir Autoplay forzado
              muted={activePlayer !== 0 || !hasInteracted}
              onEnded={() => activePlayer === 0 && handleNext()}
              preload="auto"
              playsInline
            />
            <video
              ref={videoRef1}
              src={`${servidor}${videoList[activePlayer === 1 ? currentIndex : nextIndex]?.path}`}
              className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-700", activePlayer === 1 ? "opacity-100 z-10" : "opacity-0 z-0")}
              autoPlay={activePlayer === 1 && isPlaying}
              muted={activePlayer !== 1 || !hasInteracted}
              onEnded={() => activePlayer === 1 && handleNext()}
              preload="auto"
              playsInline
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-900">
            <Play size={80} className="opacity-20 mb-4" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Esperando Contenido</span>
          </div>
        )}

        {/* Badge Live en la vista previa */}
        {!isFullscreen && (
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                LIVE: <span className="text-primary">{activeCode}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO DE CONFIGURACIÓN (Solo se ve si no es Fullscreen) */}
      {!isFullscreen && (
        <div className="z-10 w-full max-w-xl px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2"><Monitor size={32} /></div>
            <h1 className="text-5xl font-black tracking-tight text-white uppercase italic leading-none">Player <span className="text-primary not-italic">Client</span></h1>
            <p className="text-slate-400 text-lg font-medium">{isRegistered ? `Vinculado como ${linkedCode}.` : "Ingresa el código para comenzar."}</p>
          </div>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <input type="text" value={screenCode} onChange={(e) => setScreenCode(e.target.value.toUpperCase())} placeholder="CÓDIGO DE PANTALLA" className="w-full bg-white/5 border-2 border-white/10 rounded-3xl py-6 px-8 text-2xl font-black tracking-[0.2em] text-center focus:outline-none focus:border-primary transition-all shadow-2xl" />
            {error && <div className="text-red-400 bg-red-400/10 p-4 rounded-2xl border border-red-400/20 text-sm flex items-center gap-2"><AlertCircle size={18} />{error}</div>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl uppercase tracking-widest text-lg"><Cast size={24} /> {isRegistered ? "Pantalla Completa" : "Vincular"}</button>
              {isRegistered && (
                <button type="button" onClick={() => { setIsRegistered(false); localStorage.removeItem('screenName'); setVideoList([]) }} className="p-5 rounded-3xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20" title="Desvincular"><XCircle size={24} /></button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* BANNER DE MENSAJE */}
      {showBanner && bannerText && (
        <div className={cn("fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 text-center p-6 z-[110] animate-in slide-in-from-bottom-full duration-700", isFullscreen ? "p-12" : "p-6")}>
          <h2 className={cn("font-black text-white uppercase tracking-tight italic", isFullscreen ? "text-5xl md:text-8xl" : "text-xl md:text-2xl")}>{bannerText}</h2>
        </div>
      )}
    </div>
  )
}
