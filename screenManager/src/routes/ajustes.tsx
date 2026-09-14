import { createFileRoute } from '@tanstack/react-router'
import { Settings, Shield, Bell, Palette, Globe, Smartphone, Save, Lock } from 'lucide-react'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/ajustes')({
  component: SettingsPage,
})

function SettingsPage() {
  const sections = [
    { id: 'general', name: 'General', icon: Globe, description: 'Idioma, zona horaria y moneda.' },
    { id: 'security', name: 'Seguridad', icon: Shield, description: 'Autenticación de dos factores y sesiones.' },
    { id: 'notifications', name: 'Notificaciones', icon: Bell, description: 'Alertas de pantallas offline y errores.' },
    { id: 'appearance', name: 'Apariencia', icon: Palette, description: 'Personalización de colores y logotipos.' },
    { id: 'devices', name: 'Dispositivos', icon: Smartphone, description: 'Gestión de tokens y acceso remoto.' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-primary">
          <Settings size={24} />
          <h1 className="text-4xl font-bold tracking-tight text-white/90">Ajustes</h1>
        </div>
        <p className="text-slate-400 text-lg">Configura el comportamiento global de tu sistema de señalización.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                section.id === 'general' 
                  ? "bg-primary/10 text-primary font-bold shadow-lg shadow-primary/5" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <section.icon size={18} />
              <span className="text-sm">{section.name}</span>
            </button>
          ))}
        </aside>

        <div className="lg:col-span-3 space-y-8">
          <div className="glass p-8 rounded-[32px] space-y-8">
            <div className="space-y-6">
               <h3 className="text-xl font-bold flex items-center gap-2">
                 <Globe size={20} className="text-primary" />
                 Configuración de Red
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">URL de la API</label>
                   <input 
                     type="text" 
                     value="http://localhost:4006"
                     readOnly
                     className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-mono text-sm cursor-not-allowed"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Puerto Socket.IO</label>
                   <input 
                     type="text" 
                     value="4006"
                     readOnly
                     className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-mono text-sm cursor-not-allowed"
                   />
                 </div>
               </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-white/5">
               <h3 className="text-xl font-bold flex items-center gap-2 text-red-400">
                 <Lock size={20} />
                 Zona de Peligro
               </h3>
               
               <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-red-200">Reiniciar Sistema</p>
                    <p className="text-xs text-red-500/60 mt-1">Esto desconectará todas las pantallas y limpiará el caché.</p>
                  </div>
                  <button className="px-6 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold transition-all">
                    Ejecutar
                  </button>
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <button className="px-8 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 flex items-center gap-2">
                <Save size={18} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
