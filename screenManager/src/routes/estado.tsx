import { createFileRoute } from '@tanstack/react-router'
import { useScreen } from '../hooks/useScreen'
import { Monitor, Play, Pause, Square, SkipBack, SkipForward, RefreshCw, MessageSquare, Maximize2, Circle, Clock, Volume2, VolumeX } from 'lucide-react'
import { useScreens } from '../services/screenService'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/config'

export const Route = createFileRoute('/estado')({
  component: StatusPage,
})

function StatusPage() {
  const { isConnected, connectedScreens, socket } = useScreen()
  const servidor = API_URL
  // Sound setting lives on the screen record; matched to the live socket by code.
  const { data: screenRecords = [] } = useScreens()
  const queryClient = useQueryClient()
  const recordByCode = new Map(screenRecords.map((s) => [s.code, s]))
  const toggleMuted = async (code: string) => {
    const record = recordByCode.get(code)
    if (!record) return
    await api.patch(`/screens/${record.id}`, { muted: !record.muted })
    queryClient.invalidateQueries({ queryKey: ['screens'] })
  }
  
  const handleControl = (socketId: string, action: string, data?: any) => {
    if (socket?.connected && socketId) {
      socket.emit('control-screen', { screenId: socketId, action, data })
    }
  }

  const handleShowBanner = async (socketId: string) => {
    const { value: text, isDenied, isDismissed } = await Swal.fire({
      title: 'Mensaje en Pantalla',
      input: 'text',
      inputLabel: 'Escribe el mensaje o deja vacío para quitarlo',
      inputPlaceholder: 'Escribe tu mensaje aquí...',
      showCancelButton: true,
      showDenyButton: true,
      denyButtonText: 'Quitar Mensaje',
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#0f172a',
      confirmButtonColor: '#f7931e',
      denyButtonColor: '#ef4444',
    })

    if (isDenied) {
      handleControl(socketId, 'show-banner', { text: '' })
    } else if (!isDismissed && text !== undefined) {
      handleControl(socketId, 'show-banner', { text })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Monitor size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Monitor de Estado</h1>
            <p className="text-slate-500 font-medium">Control en tiempo real de pantallas conectadas</p>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur-md",
          isConnected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-red-500/10 border-red-500/20 text-red-600"
        )}>
          <Circle size={10} fill="currentColor" className={isConnected ? "animate-pulse" : ""} />
          <span className="text-sm font-bold uppercase tracking-widest">
            {isConnected ? 'Servidor Conectado' : 'Servidor Desconectado'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {connectedScreens.length > 0 ? (
          connectedScreens.map((screen) => (
            <div key={screen.socketId} className="glass p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="size-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden border-2 border-slate-900/5 relative group/thumb">
                  {screen.currentVideo ? (
                    <img 
                      src={`${servidor}/thumbs/${screen.currentVideo.thumbnail}`} 
                      className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500"
                      alt={screen.currentVideo.title}
                    />
                  ) : (
                    <Monitor size={32} />
                  )}
                  {screen.playbackStatus === 'paused' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                      <Pause size={24} className="text-slate-900 fill-white" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xl font-black text-slate-900 truncate flex items-center gap-2 italic">
                    {screen.screenName}
                    <span className="text-[10px] not-italic font-bold text-slate-500 border border-slate-800 px-2 py-0.5 rounded-lg uppercase tracking-widest bg-white/70">ID: {screen.socketId.slice(0, 4)}</span>
                  </h3>
                  
                  {screen.currentVideo && (
                    <p className="text-xs font-bold text-primary flex items-center gap-2 animate-in slide-in-from-left-2 truncate max-w-[200px]">
                      <Play size={10} fill="currentColor" />
                      {screen.currentVideo.title}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest pt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md",
                      screen.status === 'active' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                    )}>
                      {screen.status === 'active' ? 'En Línea' : 'Desconectado'}
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(screen.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-center">
                <ControlBtn 
                  icon={<SkipBack size={18} />} 
                  onClick={() => handleControl(screen.socketId, 'change-video', { direction: 'previous' })}
                  label="Anterior"
                />
                <ControlBtn 
                  icon={screen.playbackStatus === 'playing' ? <Pause size={18} /> : <Play size={18} />} 
                  onClick={() => handleControl(screen.socketId, screen.playbackStatus === 'playing' ? 'pause' : 'play')}
                  label={screen.playbackStatus === 'playing' ? 'Pausa' : 'Play'}
                  primary
                />
                <ControlBtn 
                  icon={<Square size={18} />} 
                  onClick={() => handleControl(screen.socketId, 'stop')}
                  label="Stop"
                />
                <ControlBtn 
                  icon={<SkipForward size={18} />} 
                  onClick={() => handleControl(screen.socketId, 'change-video', { direction: 'next' })}
                  label="Siguiente"
                />
                <div className="w-px h-8 bg-slate-900/10 mx-2 hidden md:block"></div>
                <ControlBtn
                  icon={recordByCode.get(screen.screenName)?.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  onClick={() => toggleMuted(screen.screenName)}
                  label={recordByCode.get(screen.screenName)?.muted ? 'Sonido apagado · activar' : 'Sonido activo · silenciar'}
                  muted={!!recordByCode.get(screen.screenName)?.muted}
                />
                <ControlBtn 
                  icon={<RefreshCw size={18} />} 
                  onClick={() => handleControl(screen.socketId, 'reload-screen')}
                  label="Recargar"
                />
                <ControlBtn 
                  icon={<Maximize2 size={18} />} 
                  onClick={() => handleControl(screen.socketId, 'toggle-fullscreen')}
                  label="Ampliar/Minimizar"
                />
                <ControlBtn 
                  icon={<MessageSquare size={18} />} 
                  onClick={() => handleShowBanner(screen.socketId)}
                  label="Banner"
                />
              </div>
            </div>
          ))
        ) : (
          <div className="glass p-20 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
             <div className="size-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
               <Monitor size={48} />
             </div>
             <h2 className="text-2xl font-bold text-slate-500">No hay pantallas conectadas</h2>
             <p className="text-slate-600 max-w-sm">Asegúrate de que las pantallas cliente tengan abierta la URL de reproducción y estén vinculadas con su código.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ControlBtn({ icon, onClick, label, primary = false, muted = false }: { icon: any, onClick: () => void, label: string, primary?: boolean, muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "size-11 rounded-xl flex items-center justify-center transition-all active:scale-90 border",
        primary 
          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90" 
          : muted
          ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
          : "bg-slate-900/5 border-slate-900/10 text-slate-600 hover:bg-slate-900/10 hover:text-slate-900"
      )}
    >
      {icon}
    </button>
  )
}
