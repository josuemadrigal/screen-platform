import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Settings, Shield, Bell, Palette, Globe, Smartphone, Save, Lock, KeyRound } from 'lucide-react'
import Swal from 'sweetalert2'
import { cn } from '../lib/utils'
import { API_URL } from '../lib/config'
import { useAuthStore } from '../store/authStore'
import { useChangePassword, apiError } from '../services/userService'
import { ApkDownloadCard } from '../components/ApkDownloadCard'

export const Route = createFileRoute('/ajustes')({
  component: SettingsPage,
})

function SettingsPage() {
  const me = useAuthStore((s) => s.user)
  const changePassword = useChangePassword()
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) return
    if (pw.newPassword.length < 6) return Swal.fire('Atención', 'La contraseña nueva debe tener al menos 6 caracteres', 'warning')
    if (pw.newPassword !== pw.confirm) return Swal.fire('Atención', 'Las contraseñas no coinciden', 'warning')
    try {
      await changePassword.mutateAsync({ id: me.id, currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      Swal.fire({ icon: 'success', title: 'Contraseña actualizada', timer: 1400, showConfirmButton: false, background: '#0f172a', color: '#f8fafc' })
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo cambiar la contraseña'), 'error')
    }
  }

  const pwInput = 'w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all'

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
          <form onSubmit={submitPassword} className="glass p-8 rounded-[32px] space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <KeyRound size={20} className="text-amber-400" />
              Mi cuenta · cambiar contraseña
            </h3>
            <p className="text-sm text-slate-400">
              Sesión iniciada como <span className="text-white font-bold">{me?.name}</span>
              {me?.role && <span className="ml-2 uppercase tracking-widest text-[10px] text-primary">{me.role.name}</span>}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña actual</label>
                <input type="password" className={pwInput} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required autoComplete="current-password" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nueva contraseña</label>
                <input type="password" className={pwInput} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={6} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmar</label>
                <input type="password" className={pwInput} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={changePassword.isPending} className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-2 disabled:opacity-50">
                <KeyRound size={18} />
                Cambiar contraseña
              </button>
            </div>
          </form>

          <ApkDownloadCard />

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
                     value={API_URL}
                     readOnly
                     className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-mono text-sm cursor-not-allowed"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Puerto Socket.IO</label>
                   <input 
                     type="text" 
                     value={(() => { try { return new URL(API_URL).port || (API_URL.startsWith('https') ? '443' : '80') } catch { return '' } })()}
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
