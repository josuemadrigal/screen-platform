import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { VideoItem } from '../components/VideoItem'
import { Plus, Film, Search } from 'lucide-react'

export const Route = createFileRoute('/videos')({
  component: VideosPage,
})

function VideosPage() {
  const [videos, setVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const fetchVideos = async () => {
      try {
        const { data } = await api.get('/storage')
        setVideos(data)
        // Videos being re-encoded for TV: poll until they are ready.
        if (data.some((v: any) => v.processing)) timer = setTimeout(fetchVideos, 5000)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideos()
    return () => clearTimeout(timer)
  }, [])

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Film size={24} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Videos</h1>
          </div>
          <p className="text-slate-600 text-lg">Biblioteca de contenidos multimedia.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group flex-1 md:w-64">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
             <input 
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Buscar videos..."
               className="w-full pl-12 pr-4 py-3 bg-slate-900/5 border border-slate-900/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
             />
          </div>
          <button 
            onClick={() => navigate({ to: '/upload' })}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Agregar Video</span>
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="glass h-64 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <VideoItem key={video.id} data={video} />
          ))}
          {filteredVideos.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-slate-900/5 size-20 rounded-full flex items-center justify-center mx-auto text-slate-500">
                <Film size={40} />
              </div>
              <p className="text-slate-600 text-lg">No se encontraron videos.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
