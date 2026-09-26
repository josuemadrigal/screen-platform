import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Play, Calendar, MoreVertical, Circle, Trash2, Edit } from 'lucide-react'
import { cn } from '../lib/utils'
import { api } from '../lib/api'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/config'

interface VideoProps {
  data: {
    id: string | number;
    title: string;
    path: string;
    duration: string;
    dateout: string;
    thumbnail: string;
    status: string | number;
  }
}

export function VideoItem({ data }: VideoProps) {
  const servidor = API_URL
  const videoUrl = `${servidor}${data.path.startsWith('/') ? data.path : '/' + data.path}`
  const thumbUrl = `${servidor}/thumbs/${data.thumbnail}`
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()
  const isOnline = data.status == '1' || data.status == 1

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log("Autoplay blocked", err));
    }
  }

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }

  return (
    <div className="glass rounded-3xl group transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 relative">
      <div 
        className="aspect-video relative bg-slate-900 cursor-pointer overflow-hidden rounded-t-[32px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video 
          ref={videoRef}
          src={videoUrl}
          poster={thumbUrl}
          muted={true}
          loop={true}
          playsInline
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="size-12 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary">
            <Play size={24} fill="currentColor" />
          </div>
        </div>

        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
          {data.duration}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors truncate pr-4">
            {data.title}
          </h3>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white relative z-10"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 glass rounded-2xl border border-white/10 shadow-2xl z-[100] overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => navigate({ to: `/video-edit/${data.id}` })}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-primary/20 hover:text-white transition-colors text-left"
                >
                  <Edit size={16} />
                  Editar Video
                </button>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const result = await Swal.fire({
                      title: '¿Eliminar video?',
                      text: "Esto borrará el archivo permanentemente",
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#ef4444',
                      cancelButtonColor: '#334155',
                      confirmButtonText: 'Sí, eliminar',
                      cancelButtonText: 'Cancelar',
                      background: '#0f172a',
                      color: '#f8fafc'
                    })

                    if (result.isConfirmed) {
                      try {
                        await api.delete(`/storage/${data.id}`)
                        Swal.fire('Eliminado', 'El video ha sido eliminado', 'success')
                        window.location.reload()
                      } catch (error) {
                        Swal.fire('Error', 'No se pudo eliminar el video', 'error')
                      }
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={14} />
            <span>Vence: {data.dateout}</span>
          </div>
          <div className={cn(
             "flex items-center gap-1.5 px-2 py-1 rounded-full border",
             isOnline 
               ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
               : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            <Circle size={6} fill="currentColor" />
            <span className="font-bold uppercase tracking-tighter text-[9px]">
              {isOnline ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
