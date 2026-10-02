import { createFileRoute, useNavigate, useBlocker } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Upload, Film, Calendar, CheckCircle2, AlertCircle, Loader2, X, Plus, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import Swal from 'sweetalert2'
import { cn } from '../lib/utils'
import { formatSize } from '../lib/media'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

type ItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error'

interface UploadItem {
  id: string
  file: File
  title: string
  dateout: string
  duration: string
  preview: string
  status: ItemStatus
  progress: number
  error?: string
}

/** "YYYY-MM-DD" for one month from today: the default expiry of a new video. */
const inOneMonth = (): string => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [optimize, setOptimize] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  // Leaving the page mid-upload cancels the request, so block in-app navigation and tab close.
  useBlocker({
    shouldBlockFn: () => {
      if (!isUploading) return false
      return !window.confirm('Los videos todavía se están subiendo. Si sales ahora se cancelará. ¿Salir de todos modos?')
    },
    enableBeforeUnload: () => isUploading,
  })

  const patch = (id: string, changes: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)))

  const addFiles = (files: FileList | File[]) => {
    const videos = Array.from(files).filter((f) => f.type.startsWith('video/'))
    if (videos.length === 0) {
      Swal.fire('Atención', 'Selecciona archivos de video (MP4, MOV, WebM…)', 'warning')
      return
    }
    const fresh: UploadItem[] = videos.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      title: titleFromFile(file.name),
      dateout: inOneMonth(),
      duration: '',
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))
    setItems((prev) => [...prev, ...fresh])
    // Read each duration from the file's metadata.
    fresh.forEach((it) => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.src = it.preview
      v.onloadedmetadata = () => patch(it.id, { duration: formatDuration(v.duration) })
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id)
      if (it) URL.revokeObjectURL(it.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  const uploadOne = async (it: UploadItem) => {
    patch(it.id, { status: 'uploading', progress: 0, error: undefined })
    const formData = new FormData()
    formData.append('file', it.file)
    formData.append('title', it.title.trim())
    formData.append('dateout', it.dateout)
    formData.append('status', '1')
    formData.append('duration', it.duration)
    formData.append('user', user?.name || 'Admin')
    formData.append('optimize', optimize ? '1' : '0')
    try {
      await api.post('/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const total = event.total ?? it.file.size
          const pct = total ? Math.min(100, Math.round((event.loaded * 100) / total)) : 0
          patch(it.id, { progress: pct, status: pct >= 100 ? 'processing' : 'uploading' })
        },
      })
      patch(it.id, { status: 'done', progress: 100 })
      return true
    } catch (error: any) {
      const m = error?.response?.data?.message
      patch(it.id, { status: 'error', error: (Array.isArray(m) ? m.join('. ') : m) || 'No se pudo subir' })
      return false
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const queue = items.filter((it) => it.status !== 'done')
    if (queue.length === 0) return
    if (queue.some((it) => !it.title.trim() || !it.dateout)) {
      Swal.fire('Atención', 'Cada video necesita un nombre y una fecha de expiración', 'warning')
      return
    }
    setIsUploading(true)
    let ok = 0
    for (const it of queue) if (await uploadOne(it)) ok++
    setIsUploading(false)
    if (ok === queue.length) {
      await Swal.fire({ icon: 'success', title: ok === 1 ? 'Video subido' : `${ok} videos subidos`, showConfirmButton: false, timer: 1400 })
      navigate({ to: '/videos' })
    } else {
      Swal.fire('Atención', `Se subieron ${ok} de ${queue.length}. Revisa los que fallaron y vuelve a intentar.`, 'warning')
    }
  }

  const pending = items.filter((it) => it.status !== 'done')
  const totalBytes = pending.reduce((acc, it) => acc + it.file.size, 0)
  const uploadedBytes = items.reduce((acc, it) => acc + (it.file.size * it.progress) / 100, 0)
  const overall = items.length ? Math.round((uploadedBytes / items.reduce((a, it) => a + it.file.size, 0)) * 100) : 0
  const current = items.find((it) => it.status === 'uploading' || it.status === 'processing')

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" role="dialog" aria-modal="true">
          <div className="glass w-full max-w-md rounded-3xl p-8 space-y-6 text-center bg-white">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {current?.status === 'processing' ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">
                Subiendo {items.filter((i) => i.status === 'done').length + 1} de {items.length}
              </h2>
              <p className="text-sm text-slate-600 truncate">{current?.title}</p>
              <p className="text-xs text-slate-500">
                {current?.status === 'processing' ? 'Generando la miniatura en el servidor…' : 'No cierres ni cambies de página hasta que termine.'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900/10">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${overall}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                <span>{formatSize(uploadedBytes)} de {formatSize(items.reduce((a, it) => a + it.file.size, 0))}</span>
                <span className="font-semibold text-slate-900">{overall}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Upload size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Subir videos</h1>
          <p className="text-slate-600 mt-1">Arrastra uno o varios archivos. Cada uno queda con su nombre y vence en un mes, salvo que lo cambies.</p>
        </div>
      </header>

      <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all py-12 px-6 text-center',
              dragActive ? 'border-primary bg-primary/5' : 'border-slate-900/15 bg-white hover:border-primary/60 hover:bg-primary/5'
            )}
          >
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              {items.length ? <Plus size={32} /> : <Film size={32} />}
            </div>
            <p className="font-bold text-slate-900">{items.length ? 'Añadir más videos' : 'Arrastra tus videos aquí'}</p>
            <p className="text-sm text-slate-500">O haz clic para seleccionar varios a la vez (MP4, MOV, WebM)</p>
            <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }} />
          </div>

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((it, index) => (
                <div
                  key={it.id}
                  className={cn(
                    'glass rounded-3xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-all',
                    it.status === 'done' && 'opacity-70',
                    it.status === 'error' && 'border-red-500/40'
                  )}
                >
                  <div className="relative w-full sm:w-40 aspect-video rounded-2xl overflow-hidden bg-slate-900 shrink-0">
                    <video src={it.preview} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    <span className="absolute top-2 left-2 size-6 rounded-md bg-primary text-white text-[10px] font-black flex items-center justify-center">{index + 1}</span>
                    {it.duration && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                        <Clock size={10} /> {it.duration}
                      </span>
                    )}
                    {it.status === 'done' && (
                      <div className="absolute inset-0 bg-emerald-600/60 flex items-center justify-center"><CheckCircle2 size={32} className="text-white" /></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nombre</label>
                      <input
                        type="text"
                        value={it.title}
                        disabled={it.status === 'done' || isUploading}
                        onChange={(e) => patch(it.id, { title: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all font-semibold text-slate-900"
                        required
                      />
                      <p className="text-[11px] text-slate-500 truncate">{it.file.name} · {formatSize(it.file.size)}{it.error ? <span className="text-red-600 font-bold"> · {it.error}</span> : null}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vence</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="date"
                          value={it.dateout}
                          disabled={it.status === 'done' || isUploading}
                          onChange={(e) => patch(it.id, { dateout: e.target.value })}
                          className="pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-slate-900"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    disabled={isUploading}
                    title="Quitar de la lista"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-500/10 transition-colors self-start sm:self-center"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-8 space-y-6 sticky top-8">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <AlertCircle size={20} className="text-primary" />
              Resumen de carga
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-3 border-b border-slate-900/5"><span className="text-slate-600">Usuario</span><span className="font-semibold text-slate-900">{user?.name || 'Admin'}</span></div>
              <div className="flex justify-between py-3 border-b border-slate-900/5"><span className="text-slate-600">Videos</span><span className="font-semibold text-slate-900">{pending.length}</span></div>
              <div className="flex justify-between py-3 border-b border-slate-900/5"><span className="text-slate-600">Tamaño total</span><span className="font-semibold text-slate-900">{formatSize(totalBytes)}</span></div>
              <div className="flex justify-between py-3"><span className="text-slate-600">Vencimiento por defecto</span><span className="font-semibold text-slate-900">{inOneMonth()}</span></div>
            </div>
            <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} className="mt-1 accent-[#d01f27]" />
              <span>
                <span className="font-semibold">Optimizar para TV</span>
                <span className="block text-xs text-slate-500">Recodifica al formato compatible. Desmárcalo solo para subir un archivo tal cual, por ejemplo para una prueba.</span>
              </span>
            </label>
            <button
              type="submit"
              disabled={isUploading || pending.length === 0}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3',
                isUploading || pending.length === 0
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
              )}
            >
              <Upload size={20} />
              {pending.length > 1 ? `Subir ${pending.length} videos` : 'Subir video'}
            </button>
            <p className="text-xs text-slate-500">Los videos se procesan al llegar para generar la miniatura. Se suben uno tras otro; puedes seguir el avance en pantalla.</p>
          </div>
        </div>
      </form>
    </div>
  )
}
