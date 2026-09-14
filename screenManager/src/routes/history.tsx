import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Activity, User, LogIn, Upload, Trash2, Edit, Monitor, Library, UserPlus, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function getActionMeta(action: string): { icon: React.ReactNode; color: string } {
  const a = action.toLowerCase()
  if (a.includes('inicio de sesión'))  return { icon: <LogIn size={16} />,    color: 'bg-emerald-500/10 text-emerald-400' }
  if (a.includes('registrado'))        return { icon: <UserPlus size={16} />,  color: 'bg-purple-500/10 text-purple-400' }
  if (a.includes('subido'))            return { icon: <Upload size={16} />,    color: 'bg-blue-500/10 text-blue-400' }
  if (a.includes('eliminado'))         return { icon: <Trash2 size={16} />,    color: 'bg-red-500/10 text-red-400' }
  if (a.includes('actualizado') || a.includes('actualizada')) return { icon: <Edit size={16} />, color: 'bg-amber-500/10 text-amber-400' }
  if (a.includes('pantalla creada'))   return { icon: <Monitor size={16} />,   color: 'bg-orange-500/10 text-orange-400' }
  if (a.includes('playlist creada'))   return { icon: <Library size={16} />,   color: 'bg-indigo-500/10 text-indigo-400' }
  return { icon: <RefreshCw size={16} />, color: 'bg-white/5 text-slate-400' }
}

function HistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/history')
      .then(({ data }) => setHistory(data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-primary">
            <Activity size={24} />
            <h1 className="text-4xl font-bold tracking-tight text-white/90">Registro de Actividad</h1>
          </div>
          <p className="text-slate-400 text-lg">Auditoría completa de todas las acciones realizadas en el sistema.</p>
        </div>
        <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm font-bold">
          {history.length} registros
        </span>
      </header>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                [1,2,3,4,5,6,7,8].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={3} className="px-8 py-8">
                      <div className="h-4 bg-white/5 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-600">
                      <Activity size={48} strokeWidth={1} />
                      <p className="font-medium">No hay registros de actividad aún.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const { icon, color } = getActionMeta(row.action)
                  return (
                    <tr key={row.id} className={cn("group transition-colors hover:bg-white/[0.02]")}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-xl shrink-0", color)}>
                            {icon}
                          </div>
                          <span className="font-medium text-slate-200 group-hover:text-white transition-colors">
                            {row.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <User size={14} />
                          </div>
                          <div className="leading-tight">
                            <p className="text-sm font-bold text-slate-300">{row.userName || 'Sistema'}</p>
                            {row.userLogin && (
                              <p className="text-[10px] text-slate-600 font-mono">@{row.userLogin}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-slate-300">
                            {new Date(row.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {new Date(row.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
