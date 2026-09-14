import { createFileRoute, Link } from '@tanstack/react-router'
import { useScreens, useDeleteScreen } from '../services/screenService'
import { Monitor, Trash2, Edit3, Plus, MapPin } from 'lucide-react'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/screens')({
  component: ScreensPage,
})

function ScreensPage() {
  const { data: screens, isLoading } = useScreens()
  const deleteScreen = useDeleteScreen()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white/90">Pantallas</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestiona y configura tus monitores remotos.</p>
        </div>
        <Link 
          to="/screen-add"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus size={20} />
          Añadir Pantalla
        </Link>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass h-64 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens?.map((screen) => (
            <div key={screen.id} className="glass rounded-[32px] p-8 group hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5">
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "p-4 rounded-2xl border",
                  screen.status === 1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'
                )}>
                  <Monitor size={32} />
                </div>
                <div className="flex gap-2">
                  <Link 
                    to="/screen-edit/$id"
                    params={{ id: screen.id.toString() }}
                    className="p-3 bg-white/5 hover:bg-primary/20 rounded-xl text-slate-400 hover:text-primary transition-all"
                  >
                    <Edit3 size={20} />
                  </Link>
                  <button 
                    onClick={async () => {
                      if (confirm('¿Eliminar pantalla?')) {
                        deleteScreen.mutate(screen.id)
                      }
                    }}
                    className="p-3 bg-white/5 hover:bg-red-500/20 rounded-xl text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                   <div className={cn("size-2 rounded-full", screen.status === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500')} />
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                     {screen.status === 1 ? 'Online' : 'Offline'}
                   </span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">{screen.name}</h3>
                <p className="text-slate-400 font-medium flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  {screen.location}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código: {screen.code}</div>
                <div className="px-3 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/5">
                  {screen.playlist || 'Sin Playlist'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
