import { createFileRoute } from '@tanstack/react-router'
import { PlayCircle, Plus, MoreHorizontal, Video } from 'lucide-react'

export const Route = createFileRoute('/playlists')({
  component: PlaylistsPage,
})

function PlaylistsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Playlists</h1>
          <p className="text-slate-600 mt-2">Create and organize content for your screens.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 font-semibold transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          New Playlist
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <PlaylistCard name="Summer Promo 2024" videos={12} duration="45:00" />
        <PlaylistCard name="Restaurant Menu Day" videos={5} duration="15:30" />
        <PlaylistCard name="Lobby Information" videos={8} duration="20:00" />
        <PlaylistCard name="Emergency Alerts" videos={2} duration="02:00" />
      </div>
    </div>
  )
}

function PlaylistCard({ name, videos, duration }: { name: string, videos: number, duration: string }) {
  return (
    <div className="glass rounded-2xl overflow-hidden glass-hover group">
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative overflow-hidden">
        <PlayCircle size={48} className="text-slate-600 group-hover:text-primary group-hover:scale-110 transition-all" />
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
          {duration}
        </div>
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="font-bold group-hover:text-primary transition-colors">{name}</h3>
          <button className="text-slate-500 hover:text-slate-900 transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
          <Video size={14} />
          <span>{videos} Videos</span>
        </div>
        
        <div className="mt-6 flex gap-2">
          <button className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-900/5 hover:bg-slate-900/10 transition-colors">Edit</button>
          <button className="flex-1 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Assign</button>
        </div>
      </div>
    </div>
  )
}
