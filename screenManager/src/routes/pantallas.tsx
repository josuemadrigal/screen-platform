import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useScreens } from '../services/screenService'
import { PantallaItem } from '../components/PantallaItem'
import { Plus, LayoutGrid } from 'lucide-react'

export const Route = createFileRoute('/pantallas')({
  component: PantallasPage,
})

function PantallasPage() {
  const { data: screens, isLoading } = useScreens()
  const navigate = useNavigate()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <LayoutGrid size={24} />
            <h1 className="text-4xl font-bold tracking-tight text-white/90">Pantallas</h1>
          </div>
          <p className="text-slate-400 text-lg">Administra y monitorea tus dispositivos en tiempo real.</p>
        </div>
        <button 
          onClick={() => navigate({ to: '/nueva-pantalla' })}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus size={24} />
          Nueva Pantalla
        </button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass h-80 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {screens?.map((screen) => (
            <PantallaItem key={screen.id} data={screen as any} />
          ))}
          {screens?.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-white/5 size-20 rounded-full flex items-center justify-center mx-auto text-slate-500">
                <LayoutGrid size={40} />
              </div>
              <p className="text-slate-400 text-lg">No hay pantallas registradas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
