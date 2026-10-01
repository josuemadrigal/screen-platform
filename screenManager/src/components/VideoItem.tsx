import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Play, Calendar, MoreVertical, Trash2, Edit, HardDrive, Clock } from 'lucide-react'
import { cn } from '../lib/utils'
import { formatSize, parseDuration, formatDuration, todayISO } from '../lib/media'
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
    size?: number | null;
  }
}

/** Days from today to the expiry date (negative when already expired). */
const daysLeft = (dateout: string): number => {
  const [y, m, d] = dateout.split('-').map(Number)
  const [ty, tm, td] = todayISO().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function VideoItem({ data }: VideoProps) {
  const servidor = API_URL
  const videoUrl = `${servidor}${data.path.startsWith('/') ? data.path : '/' + data.path}`
  const thumbUrl = `${servidor}/thumbs/${data.thumbnail}`

  const videoRef = useRef<HTMLVideoElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()
  const isActive = data.status == '1' || data.status == 1
  const left = data.dateout ? daysLeft(data.dateout) : null
  const expiry =
    left === null ? { text: 'Sin vencimiento', tone: 'text-slate-500' }
    : left < 0 ? { text: `Venció el ${formatDate(data.dateout)}`, tone: 'text-red-600' }
    : left === 0 ? { text: 'Vence hoy', tone: 'text-red-600' }
    : left <= 7 ? { text: `Vence en ${left} d · ${formatDate(data.dateout)}`, tone: 'text-amber-600' }
    : { text: `Vence ${formatDate(data.dateout)}`, tone: 'text-slate-600' }

  const handleMouseEnter = () => videoRef.current?.play().catch(() => {})
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const remove = async () => {
    const result = await Swal.fire({
      title: `¿Eliminar "${data.title}"?`,
      text: 'Se borra el archivo y sale de todas las playlists.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#64748b',
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/storage/${data.id}`)
      window.location.reload()
    } catch {
      Swal.fire('Error', 'No se pudo eliminar el video', 'error')
    }
  }

  return (
    <div className="glass rounded-3xl group transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 relative flex flex-col overflow-visible">
      <div
        className="aspect-video relative bg-slate-900 cursor-pointer overflow-hidden rounded-t-3xl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => navigate({ to: `/video-edit/${data.id}` })}
      >
        <video ref={videoRef} src={videoUrl} poster={thumbUrl} muted loop playsInline preload="none" className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="size-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-primary shadow-xl">
            <Play size={22} fill="currentColor" />
          </div>
        </div>
        <span className={cn(
          'absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md',
          isActive ? 'bg-emerald-500/90 text-white' : 'bg-slate-900/80 text-white'
        )}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
        <span className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1 tabular-nums">
          <Clock size={11} />
          {formatDuration(parseDuration(data.duration))}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 break-all" title={data.title}>
            {data.title}
          </h3>
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
              onBlur={() => setTimeout(() => setShowMenu(false), 150)}
              className="p-1.5 -mr-1.5 hover:bg-slate-900/5 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl border border-slate-900/10 shadow-2xl z-[100] overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onMouseDown={() => navigate({ to: `/video-edit/${data.id}` })}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-900/5 hover:text-slate-900 transition-colors text-left"
                >
                  <Edit size={16} /> Editar
                </button>
                <button
                  onMouseDown={remove}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-1.5 text-xs">
          <div className={cn('flex items-center gap-2 font-semibold', expiry.tone)}>
            <Calendar size={13} className="shrink-0" />
            <span>{expiry.text}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <HardDrive size={13} className="shrink-0" />
            <span>{formatSize(data.size)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
