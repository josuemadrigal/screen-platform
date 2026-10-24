import { useEffect, useState } from 'react'
import { Library, Maximize, Minimize2, Wand2 } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

export type VideoFit = 'auto' | 'contain' | 'cover'

const FIT_OPTIONS: { value: VideoFit; label: string; hint: string; icon: any }[] = [
  { value: 'auto', label: 'Automático', hint: 'No estira: si la forma del video no coincide con la pantalla (vertical, cuadrado), se ve completo con bandas negras.', icon: Wand2 },
  { value: 'contain', label: 'No estirar', hint: 'Siempre completo, con bandas negras donde sobre espacio.', icon: Minimize2 },
  { value: 'cover', label: 'Llenar pantalla', hint: 'Ocupa toda la pantalla; recorta los bordes si la forma no coincide.', icon: Maximize },
]

export const fitLabel = (fit?: string) => FIT_OPTIONS.find((o) => o.value === fit)?.label ?? 'Automático'

/** How the TV fits the video: auto, no stretch (black bars) or fill. */
export function FitSelect({ value, onChange, disabled }: { value: VideoFit; onChange: (v: VideoFit) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {FIT_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          title={o.hint}
          className={cn(
            'flex items-start gap-3 p-3 rounded-2xl border text-left transition-all disabled:opacity-50',
            value === o.value ? 'bg-primary/10 border-primary/40 text-slate-900' : 'bg-slate-900/[0.03] border-slate-900/10 text-slate-600 hover:border-slate-900/20'
          )}
        >
          <o.icon size={18} className={cn('mt-0.5 shrink-0', value === o.value ? 'text-primary' : 'text-slate-400')} />
          <span>
            <span className="block text-sm font-bold">{o.label}</span>
            <span className="block text-[11px] leading-snug text-slate-500">{o.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

interface Circuit {
  id: number
  playlistname: string
  videosCount?: number
}

/** Checklist of circuits (playlists) with an "all circuits" toggle. */
export function CircuitPicker({ value, onChange, disabled }: { value: number[]; onChange: (ids: number[]) => void; disabled?: boolean }) {
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Circuit[]>('/playlists')
      .then(({ data }) => setCircuits([...data].sort((a, b) => a.playlistname.localeCompare(b.playlistname, 'es', { sensitivity: 'base' }))))
      .catch(() => setCircuits([]))
      .finally(() => setLoading(false))
  }, [])

  const all = circuits.length > 0 && circuits.every((c) => value.includes(c.id))
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  if (loading) return <div className="h-12 rounded-2xl bg-slate-900/5 animate-pulse" />
  if (circuits.length === 0) return <p className="text-sm text-slate-500">Todavía no hay circuitos creados.</p>

  return (
    <div className="space-y-2">
      <label className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all',
        all ? 'bg-primary/10 border-primary/40' : 'bg-slate-900/[0.03] border-slate-900/10 hover:border-slate-900/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        <input
          type="checkbox"
          checked={all}
          disabled={disabled}
          onChange={() => onChange(all ? [] : circuits.map((c) => c.id))}
          className="accent-[#d01f27] size-4"
        />
        <Library size={16} className="text-primary" />
        <span className="text-sm font-bold text-slate-900">Todos los circuitos</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {circuits.map((c) => (
          <label
            key={c.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all',
              value.includes(c.id) ? 'bg-primary/5 border-primary/30' : 'bg-white border-slate-900/10 hover:border-slate-900/20',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input type="checkbox" checked={value.includes(c.id)} disabled={disabled} onChange={() => toggle(c.id)} className="accent-[#d01f27] size-4" />
            <span className="text-sm font-semibold text-slate-800 truncate">{c.playlistname}</span>
            {typeof c.videosCount === 'number' && <span className="ml-auto text-[11px] text-slate-400 shrink-0">{c.videosCount} videos</span>}
          </label>
        ))}
      </div>
    </div>
  )
}
