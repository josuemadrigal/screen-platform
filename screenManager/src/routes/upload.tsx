import { createFileRoute, useNavigate, useBlocker } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Upload, Film, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import Swal from 'sweetalert2'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')
  const [title, setTitle] = useState('')
  const [dateout, setDateout] = useState('')
  const [duration, setDuration] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  // 0-100 while the file travels to the server; 'processing' once it arrived and the server makes the thumbnail.
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'uploading' | 'processing'>('uploading')
  const [dragActive, setDragActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()

  // Leaving the page mid-upload cancels the request, so block in-app navigation and tab close.
  useBlocker({
    shouldBlockFn: () => {
      if (!isUploading) return false
      return !window.confirm('El video todavía se está subiendo. Si sales ahora se cancelará. ¿Salir de todos modos?')
    },
    enableBeforeUnload: () => isUploading,
  })

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('video/')) {
      Swal.fire('Error', 'Por favor selecciona un archivo de video válido', 'error')
      return
    }

    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setVideoPreview(url)

    // Capture duration
    const tempVideo = document.createElement('video')
    tempVideo.src = url
    tempVideo.onloadedmetadata = () => {
      setDuration(formatDuration(tempVideo.duration))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !dateout) {
      Swal.fire('Atención', 'Todos los campos son obligatorios', 'warning')
      return
    }

    setIsUploading(true)
    setProgress(0)
    setPhase('uploading')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('dateout', dateout)
    formData.append('status', '1')
    formData.append('duration', duration)
    formData.append('user', user?.name || 'Admin')

    try {
      await api.post('/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const total = event.total ?? file.size
          const pct = total ? Math.min(100, Math.round((event.loaded * 100) / total)) : 0
          setProgress(pct)
          if (pct >= 100) setPhase('processing')
        },
      })
      
      Swal.fire({
        icon: 'success',
        title: 'Video subido con éxito',
        showConfirmButton: false,
        timer: 1500
      })
      
      setTimeout(() => navigate({ to: '/videos' }), 1500)
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo subir el video', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const fileSizeMb = file ? file.size / (1024 * 1024) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isUploading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-progress-title"
        >
          <div className="glass w-full max-w-md rounded-3xl p-8 space-y-6 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {phase === 'uploading' ? <Upload size={32} /> : <Loader2 size={32} className="animate-spin" />}
            </div>

            <div className="space-y-1">
              <h2 id="upload-progress-title" className="text-2xl font-bold text-white/90">
                {phase === 'uploading' ? 'Subiendo video…' : 'Procesando video…'}
              </h2>
              <p className="text-sm text-slate-400">
                {phase === 'uploading'
                  ? 'No cierres ni cambies de página hasta que termine.'
                  : 'El archivo ya llegó al servidor. Generando la miniatura, esto tarda unos segundos.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-[width] duration-300",
                    phase === 'processing' && "animate-pulse"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 tabular-nums">
                <span>{((fileSizeMb * progress) / 100).toFixed(1)} MB de {fileSizeMb.toFixed(1)} MB</span>
                <span className="font-semibold text-white/80">{progress}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 truncate">{file?.name}</p>
          </div>
        </div>
      )}
      <header className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Upload size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white/90">Subir Video</h1>
          <p className="text-slate-400 mt-1">Agrega nuevo contenido multimedia a tu red.</p>
        </div>
      </header>

      <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all overflow-hidden",
              dragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/50 hover:bg-white/5",
              file ? "border-emerald-500/50" : ""
            )}
          >
            {videoPreview ? (
              <video 
                src={videoPreview} 
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                autoPlay 
                muted 
                loop 
              />
            ) : null}
            
            <div className="relative z-10 flex flex-col items-center text-center p-6">
               {file ? (
                 <>
                   <CheckCircle2 size={48} className="text-emerald-500 mb-2" />
                   <p className="font-bold text-white max-w-[200px] truncate">{file.name}</p>
                   <p className="text-xs text-slate-400 mt-1">{duration}</p>
                 </>
               ) : (
                 <>
                   <Film size={48} className="text-slate-500 mb-2" />
                   <p className="font-medium text-slate-300">Arrastra tu video aquí</p>
                   <p className="text-xs text-slate-500">O haz clic para seleccionar (MP4, MOV, etc.)</p>
                 </>
               )}
            </div>
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept="video/*" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-400 ml-1">Título del Video</label>
               <input 
                 type="text" 
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="Ej. Promo Verano 2024"
                 className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                 required
               />
             </div>

             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-400 ml-1">Fecha de Expiración</label>
               <div className="relative">
                 <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input 
                   type="date" 
                   value={dateout}
                   onChange={(e) => setDateout(e.target.value)}
                   className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none"
                   required
                 />
               </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle size={20} className="text-primary" />
                Resumen de Carga
              </h2>
              
              <div className="space-y-4 text-sm">
                 <div className="flex justify-between py-3 border-b border-white/5">
                   <span className="text-slate-400">Usuario:</span>
                   <span className="font-medium">{user?.name || 'Admin'}</span>
                 </div>
                 <div className="flex justify-between py-3 border-b border-white/5">
                   <span className="text-slate-400">Formato:</span>
                   <span className="font-medium">{file?.type.split('/')[1]?.toUpperCase() || '-'}</span>
                 </div>
                 <div className="flex justify-between py-3 border-b border-white/5">
                   <span className="text-slate-400">Tamaño:</span>
                   <span className="font-medium">{file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : '-'}</span>
                 </div>
                 <div className="flex justify-between py-3">
                   <span className="text-slate-400">Duración:</span>
                   <span className="font-medium">{duration || '-'}</span>
                 </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98]",
                  isUploading 
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                    : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                )}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Subiendo...
                  </div>
                ) : 'Confirmar y Subir'}
              </button>
           </div>
           
           <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-xs text-blue-400 leading-relaxed">
                Tip: Los videos se procesarán automáticamente para generar miniaturas y optimizar el streaming en las pantallas.
              </p>
           </div>
        </div>
      </form>
    </div>
  )
}
