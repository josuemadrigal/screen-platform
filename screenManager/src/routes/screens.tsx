import { createFileRoute, Link } from '@tanstack/react-router'
import { useScreens, useDeleteScreen } from '../services/screenService'
import { Monitor, Trash2, Edit3, Plus, MapPin, Download, Volume2, VolumeX } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { screenKeys } from '../services/screenService'
import { APK_URL } from '../lib/config'
import { useApkInfo } from '../components/ApkDownloadCard'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/screens')({
  component: ScreensPage,
})

function ScreensPage() {
  const { data: screens, isLoading } = useScreens()
  const deleteScreen = useDeleteScreen()
  const { data: apk } = useApkInfo()
  const queryClient = useQueryClient()
  // Sound on/off per screen: saved on the screen and pushed live to the TV (no reload).
  const toggleMuted = async (id: number, muted: boolean) => {
    await api.patch(`/screens/${id}`, { muted })
    queryClient.invalidateQueries({ queryKey: screenKeys.all })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Pantallas</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestiona y configura tus monitores remotos.</p>
        </div>
        <div className="flex gap-3">
          {apk && (
            <a
              href={APK_URL}
              download="screentv.apk"
              title={`Aplicación Android TV v${apk.version}`}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 text-slate-800 font-bold transition-all"
            >
              <Download size={20} />
              APK v{apk.version}
            </a>
          )}
          <Link 
            to="/screen-add"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            Añadir Pantalla
          </Link>
        </div>
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
                  (screen.connected ?? 0) > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'
                )}>
                  <Monitor size={32} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleMuted(screen.id, !screen.muted)}
                    title={screen.muted ? 'Sonido apagado · clic para activar' : 'Sonido activo · clic para silenciar'}
                    className={cn(
                      'p-3 rounded-xl transition-all',
                      screen.muted ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' : 'bg-slate-900/5 text-slate-500 hover:bg-secondary/10 hover:text-secondary'
                    )}
                  >
                    {screen.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <Link 
                    to="/screen-edit/$id"
                    params={{ id: screen.id.toString() }}
                    className="p-3 bg-slate-900/5 hover:bg-primary/20 rounded-xl text-slate-600 hover:text-primary transition-all"
                  >
                    <Edit3 size={20} />
                  </Link>
                  <button 
                    onClick={async () => {
                      if (confirm('¿Eliminar pantalla?')) {
                        deleteScreen.mutate(screen.id)
                      }
                    }}
                    className="p-3 bg-slate-900/5 hover:bg-red-500/20 rounded-xl text-slate-600 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                   <div className={cn("size-2 rounded-full", (screen.connected ?? 0) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500')} />
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                     {(screen.connected ?? 0) > 0
                       ? `En línea · ${screen.connected} ${screen.connected === 1 ? 'TV conectada' : 'TVs conectadas'}`
                       : 'Sin TV conectada'}
                   </span>
                   {screen.status !== 1 && (
                     <span className="ml-2 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 text-[9px] font-bold uppercase tracking-widest">Inactiva</span>
                   )}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 leading-tight">{screen.name}</h3>
                <p className="text-slate-600 font-medium flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  {screen.location}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-900/5 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código: {screen.code}</div>
                <div className="px-3 py-1 rounded-lg bg-slate-900/5 text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-slate-900/5">
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
