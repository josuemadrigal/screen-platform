import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Monitor, Clock, MoreVertical, Circle, Edit, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { api } from '../lib/api'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/config'

interface PantallaProps {
  data: {
    id: number;
    name: string;
    code: string;
    location: string;
    updatedAt: string;
    status: string | number;
    playlist: string;
  }
}

export function PantallaItem({ data }: PantallaProps) {
  const servidor = API_URL
  const videoPreview = `${servidor}/spot.mp4` // Si no existe, al menos la ruta es la estándar del viejo código

  const isOnline = data.status == '1' || data.status == 1

  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="glass rounded-3xl group transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 relative">
      <div className="aspect-video relative bg-white overflow-hidden rounded-t-[32px]">
        <video 
          src={videoPreview}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute top-4 left-4">
           <div className={cn(
             "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border",
             isOnline 
               ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
               : "bg-red-500/10 border-red-500/20 text-red-600"
           )}>
             <Circle size={10} fill="currentColor" className={isOnline ? "animate-pulse" : ""} />
             <span className="text-[10px] font-bold uppercase tracking-wider">
               {isOnline ? 'Online' : 'Offline'}
             </span>
           </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start relative">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
              {data.code} - {data.name}
            </h3>
            <p className="text-slate-600 text-sm flex items-center gap-2">
              <Monitor size={14} />
              {data.location}
            </p>
          </div>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-slate-900/5 rounded-xl transition-colors text-slate-500 hover:text-slate-900 relative z-10"
            >
              <MoreVertical size={20} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 glass rounded-2xl border border-slate-900/10 shadow-2xl z-[100] overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => navigate({ to: `/edit/${data.id}` })}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-primary/20 hover:text-slate-900 transition-colors text-left"
                >
                  <Edit size={16} />
                  Editar Pantalla
                </button>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const result = await Swal.fire({
                      title: '¿Eliminar pantalla?',
                      text: "Esta acción no se puede deshacer",
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#ef4444',
                      cancelButtonColor: '#64748b',
                      confirmButtonText: 'Sí, eliminar',
                      cancelButtonText: 'Cancelar',
                      background: '#ffffff',
                      color: '#0f172a'
                    })

                    if (result.isConfirmed) {
                      try {
                        await api.delete(`/screens/${data.id}`)
                        Swal.fire('Eliminado', 'La pantalla ha sido eliminada', 'success')
                        window.location.reload() // Or use a proper cache invalidation
                      } catch (error) {
                        Swal.fire('Error', 'No se pudo eliminar la pantalla', 'error')
                      }
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900/5 flex items-center justify-between text-xs text-slate-500">
           <div className="flex items-center gap-2">
             <Clock size={14} />
             <span>{new Date(data.updatedAt).toLocaleString()}</span>
           </div>
           <div className="px-3 py-1 rounded-lg bg-slate-900/5 text-slate-700 font-medium">
             {data.playlist || 'Sin Playlist'}
           </div>
        </div>
      </div>
    </div>
  )
}
