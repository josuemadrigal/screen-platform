import { createFileRoute } from '@tanstack/react-router'
import { useScreen } from '../hooks/useScreen'
import { 
  Activity, Play, Pause, Square, SkipBack, SkipForward, 
  RefreshCw, Maximize2, MessageSquare, Circle, 
  Monitor, Clock, LayoutGrid, Zap, Signal, CheckCircle2
} from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/status')({
  component: ScreenStatusPage,
})

function ScreenStatusPage() {
  const { isConnected, connectedScreens, socket } = useScreen()
  const servidor = import.meta.env.VITE_API_URL || 'http://localhost:4006'

  const handleControl = (socketId: string, action: string, data?: any) => {
    if (socket && socketId) {
      socket.emit('control-screen', { screenId: socketId, action, data })
    }
  }

  const handleShowBanner = async (socketId: string) => {
    const { value: text, isDenied } = await Swal.fire({
      title: 'Mensaje para pantalla',
      input: 'text',
      inputPlaceholder: 'Escribe el mensaje aquí...',
      showCancelButton: true,
      showDenyButton: true,
      denyButtonText: 'Quitar Mensaje',
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      background: '#0f172a',
      color: '#fff',
      confirmButtonColor: '#f7931e',
      denyButtonColor: '#ef4444',
      customClass: { input: 'swal-input-dark' }
    })

    if (isDenied) {
      handleControl(socketId, 'show-banner', { text: '' })
    } else if (text !== undefined) {
      handleControl(socketId, 'show-banner', { text })
    }
  }

  // Estadísticas
  const stats = [
    { label: 'Pantallas Online', value: connectedScreens.length, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Reproduciendo', value: connectedScreens.filter(s => s.playbackStatus === 'playing').length, icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Estado Servidor', value: isConnected ? 'Activo' : 'Down', icon: Zap, color: isConnected ? 'text-orange-400' : 'text-red-400', bg: isConnected ? 'bg-orange-400/10' : 'bg-red-400/10' },
    { label: 'Uptime Global', value: '99.9%', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      
      {/* HEADER DINÁMICO */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
              <LayoutGrid size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
              Control <span className="text-primary not-italic">Center</span>
            </h1>
          </div>
          <p className="text-slate-400 text-lg font-medium">Gestión avanzada de señalización digital.</p>
        </div>
        
        <div className={cn(
          "flex items-center gap-3 px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all",
          isConnected 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          <Signal size={16} className={isConnected ? "animate-pulse" : ""} />
          <span className="text-xs font-black uppercase tracking-[0.2em]">
            {isConnected ? 'Sistema Online' : 'Sistema Offline'}
          </span>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-6 rounded-[32px] border border-white/5 flex items-center gap-5 hover:border-white/10 transition-colors group">
            <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
              <h2 className="text-2xl font-black text-white">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* MONITOR GRID */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Monitor size={20} className="text-primary" />
            Pantallas Conectadas
          </h2>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            Total: {connectedScreens.length} dispositivos
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {connectedScreens.map((screen) => (
            <div 
              key={screen.socketId} 
              className="glass rounded-[40px] border border-white/5 p-6 flex flex-col gap-6 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5 group relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="size-24 rounded-[32px] bg-slate-900 border-2 border-white/5 overflow-hidden relative shrink-0 group/preview shadow-2xl">
                    {screen.screenshot || screen.currentVideo ? (
                      <img 
                        src={screen.screenshot || `${servidor}/thumbs/${screen.currentVideo?.thumbnail}`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/preview:scale-110"
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Monitor size={40} />
                      </div>
                    )}
                    
                    {/* Badge de LIVE si hay captura real */}
                    {screen.screenshot && (
                      <div className="absolute top-2 left-2 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter animate-pulse text-white z-10">
                        Live
                      </div>
                    )}

                    {screen.playbackStatus === 'paused' && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Pause size={24} className="text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-white truncate italic uppercase tracking-tight leading-tight">
                      {screen.screenName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-md">
                        ID: {screen.socketId.slice(0, 6)}
                      </span>
                      {screen.currentVideo && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary animate-pulse">
                          <Play size={10} fill="currentColor" />
                          <span className="text-[10px] font-black uppercase truncate max-w-[100px]">
                            {screen.currentVideo.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2",
                  screen.status === 'active' 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                  <Circle size={8} fill="currentColor" className={screen.status === 'active' ? "animate-pulse" : ""} />
                  {screen.status === 'active' ? 'Online' : 'Standby'}
                </div>
              </div>

              {/* ACCIONES RÁPIDAS */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleControl(screen.socketId, screen.playbackStatus === 'playing' ? 'pause' : 'play')}
                  className={cn(
                    "h-12 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                    screen.playbackStatus === 'playing' 
                      ? "bg-white/5 hover:bg-white/10 text-white" 
                      : "bg-primary text-white shadow-lg shadow-primary/20"
                  )}
                >
                  {screen.playbackStatus === 'playing' ? <Pause size={16} /> : <Play size={16} />}
                  {screen.playbackStatus === 'playing' ? 'Pausar' : 'Reproducir'}
                </button>
                <button
                  onClick={() => handleShowBanner(screen.socketId)}
                  className="h-12 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  <MessageSquare size={16} />
                  Mensaje
                </button>
              </div>

              {/* CONTROLES AVANZADOS */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <ControlButton icon={SkipBack} onClick={() => handleControl(screen.socketId, 'change-video', { direction: 'previous' })} />
                  <ControlButton icon={Square} onClick={() => handleControl(screen.socketId, 'stop')} />
                  <ControlButton icon={SkipForward} onClick={() => handleControl(screen.socketId, 'change-video', { direction: 'next' })} />
                </div>
                <div className="flex items-center gap-1">
                  <ControlButton icon={RefreshCw} onClick={() => handleControl(screen.socketId, 'reload-screen')} />
                  <ControlButton icon={Maximize2} onClick={() => handleControl(screen.socketId, 'toggle-fullscreen')} />
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}

          {connectedScreens.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-1000">
              <div className="bg-white/5 size-24 rounded-[40px] flex items-center justify-center text-slate-700 relative">
                <Monitor size={48} />
                <div className="absolute -top-2 -right-2 size-6 bg-red-500 rounded-full border-4 border-[#020617]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Esperando Dispositivos</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto">Conecta una pantalla cliente ingresando su código para verla aparecer aquí en tiempo real.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ControlButton({ icon: Icon, onClick, className }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all active:scale-90",
        className
      )}
    >
      <Icon size={18} />
    </button>
  )
}
