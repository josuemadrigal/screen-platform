import { createFileRoute, Link } from '@tanstack/react-router'
import { Users, UserPlus, Edit3, Trash2, ShieldCheck, KeyRound } from 'lucide-react'
import Swal from 'sweetalert2'
import { cn } from '../lib/utils'
import { useAuthStore, PERM } from '../store/authStore'
import { useUsers, useDeleteUser, timeAgo, formatDateTime, apiError } from '../services/userService'

export const Route = createFileRoute('/users')({
  component: UsersPage,
})

function UsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const deleteUser = useDeleteUser()
  const me = useAuthStore((s) => s.user)
  const canManage = useAuthStore((s) => s.hasPermission(PERM.USERS_MANAGE))
  const canView = useAuthStore((s) => s.hasPermission(PERM.USERS_VIEW))

  const handleDelete = async (id: number, name: string) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar a ${name}?`,
      text: 'Perderá el acceso al panel de inmediato.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#0f172a',
      color: '#f8fafc',
    })
    if (!isConfirmed) return
    try {
      await deleteUser.mutateAsync(id)
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo eliminar el usuario'), 'error')
    }
  }

  if (!canView) {
    return (
      <div className="glass rounded-[32px] p-12 text-center text-slate-400">
        <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
        Tu rol no tiene permiso para ver esta sección.
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white/90">Usuarios</h1>
          <p className="text-slate-500 mt-2 font-medium">Quién accede al panel, con qué rol y cuándo se conectó por última vez.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/roles"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold transition-all"
          >
            <ShieldCheck size={20} />
            Roles y permisos
          </Link>
          {canManage && (
            <Link
              to="/user-new"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
            >
              <UserPlus size={20} />
              Nuevo usuario
            </Link>
          )}
        </div>
      </header>

      <div className="glass rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                <th className="px-6 py-4 font-bold">Usuario</th>
                <th className="px-6 py-4 font-bold">Rol</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold">Última conexión</th>
                <th className="px-6 py-4 font-bold">Última actividad</th>
                {canManage && <th className="px-6 py-4 font-bold text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Cargando usuarios…</td>
                </tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    No hay usuarios.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        title={u.online ? 'En línea' : 'Desconectado'}
                        className={cn('size-2.5 rounded-full shrink-0', u.online ? 'bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60' : 'bg-slate-600')}
                      />
                      <div>
                        <div className="font-bold text-white/90">
                          {u.name}
                          {me?.id === u.id && <span className="ml-2 text-[10px] uppercase tracking-widest text-primary">tú</span>}
                        </div>
                        <div className="text-xs text-slate-500">@{u.user} · {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role ? (
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                        u.role.name === 'admin' ? 'bg-primary/15 text-primary' : 'bg-white/5 text-slate-300'
                      )}>
                        <ShieldCheck size={12} />
                        {u.role.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">sin rol</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold',
                      u.status === '1' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    )}>
                      {u.status === '1' ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300" title={formatDateTime(u.lastLoginAt)}>{timeAgo(u.lastLoginAt)}</td>
                  <td className="px-6 py-4 text-slate-300" title={formatDateTime(u.lastSeenAt)}>
                    {u.online ? <span className="text-emerald-400 font-bold">En línea</span> : timeAgo(u.lastSeenAt)}
                  </td>
                  {canManage && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to="/user-edit/$id"
                          params={{ id: String(u.id) }}
                          title="Editar y contraseña"
                          className="p-2.5 bg-white/5 hover:bg-primary/20 rounded-xl text-slate-400 hover:text-primary transition-all"
                        >
                          <Edit3 size={18} />
                        </Link>
                        <Link
                          to="/user-edit/$id"
                          params={{ id: String(u.id) }}
                          hash="password"
                          title="Cambiar contraseña"
                          className="p-2.5 bg-white/5 hover:bg-amber-500/20 rounded-xl text-slate-400 hover:text-amber-400 transition-all"
                        >
                          <KeyRound size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          disabled={me?.id === u.id}
                          title={me?.id === u.id ? 'No puedes eliminar tu propio usuario' : 'Eliminar'}
                          className="p-2.5 bg-white/5 hover:bg-red-500/20 rounded-xl text-slate-400 hover:text-red-400 transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-slate-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
