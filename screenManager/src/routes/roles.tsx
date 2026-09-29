import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ShieldCheck, Plus, Trash2, Save, Lock, Users } from 'lucide-react'
import Swal from 'sweetalert2'
import { cn } from '../lib/utils'
import { useAuthStore, PERM, permLabel } from '../store/authStore'
import { useRoles, usePermissions, useCreateRole, useUpdateRole, useDeleteRole, apiError, type RoleDetail } from '../services/userService'

export const Route = createFileRoute('/roles')({
  component: RolesPage,
})

const inputCls =
  'w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all'

function RolesPage() {
  const { data: roles = [], isLoading } = useRoles()
  const { data: permissions = [] } = usePermissions()
  const canManage = useAuthStore((s) => s.hasPermission(PERM.USERS_MANAGE))
  const canView = useAuthStore((s) => s.hasPermission(PERM.USERS_VIEW))
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const createRole = useCreateRole()
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '', permissions: [] as string[] })

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createRole.mutateAsync(draft)
      setDraft({ name: '', description: '', permissions: [] })
      setShowNew(false)
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo crear el rol'), 'error')
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
          <h1 className="text-4xl font-bold tracking-tight text-white/90">Roles y permisos</h1>
          <p className="text-slate-500 mt-2 font-medium">Cada usuario tiene un rol; el rol decide qué puede hacer en el panel.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            Nuevo rol
          </button>
        )}
      </header>

      {showNew && (
        <form onSubmit={submitNew} className="glass rounded-[32px] p-8 space-y-6 border border-primary/30">
          <h2 className="text-xl font-bold">Nuevo rol</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input className={inputCls} placeholder="Nombre (ej. recepción)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required minLength={2} />
            <input className={inputCls} placeholder="Descripción (opcional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <PermissionPicker permissions={permissions} selected={draft.permissions} onChange={(p) => setDraft({ ...draft, permissions: p })} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowNew(false)} className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold">Cancelar</button>
            <button type="submit" disabled={createRole.isPending} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-50">
              <Save size={18} /> Crear rol
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="glass h-56 rounded-[32px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} permissions={permissions} canManage={canManage} onSaved={refreshMe} />
          ))}
        </div>
      )}
    </div>
  )
}

function PermissionPicker({
  permissions, selected, onChange, disabled, lockedKeys = [],
}: {
  permissions: { key: string; description: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  lockedKeys?: string[]
}) {
  const toggle = (key: string) => {
    if (disabled || lockedKeys.includes(key)) return
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {permissions.map((p) => {
        const on = selected.includes(p.key)
        const locked = lockedKeys.includes(p.key)
        return (
          <label
            key={p.key}
            className={cn(
              'flex items-start gap-3 p-3 rounded-2xl border transition-all',
              on ? 'bg-primary/10 border-primary/30' : 'bg-white/[0.02] border-white/5',
              disabled || locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'
            )}
          >
            <input type="checkbox" className="mt-1 accent-[var(--color-primary,#6366f1)]" checked={on} disabled={disabled || locked} onChange={() => toggle(p.key)} />
            <div>
              <div className="text-sm font-bold text-white/90 flex items-center gap-2">
                {permLabel(p.key)}
                {locked && <Lock size={12} className="text-slate-500" />}
              </div>
              <div className="text-xs text-slate-400">{p.description}</div>
            </div>
          </label>
        )
      })}
    </div>
  )
}

function RoleCard({ role, permissions, canManage, onSaved }: {
  role: RoleDetail
  permissions: { key: string; description: string }[]
  canManage: boolean
  onSaved: () => Promise<void>
}) {
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()
  const [selected, setSelected] = useState<string[]>(role.permissions)
  const dirty = selected.length !== role.permissions.length || selected.some((k) => !role.permissions.includes(k))

  const save = async () => {
    try {
      await updateRole.mutateAsync({ id: role.id, permissions: selected })
      await onSaved()
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo guardar el rol'), 'error')
    }
  }

  const remove = async () => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar el rol "${role.name}"?`, icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444', background: '#0f172a', color: '#f8fafc',
    })
    if (!isConfirmed) return
    try {
      await deleteRole.mutateAsync(role.id)
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo eliminar el rol'), 'error')
    }
  }

  return (
    <div className="glass rounded-[32px] p-8 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-2xl', role.isSystem ? 'bg-primary/10 text-primary' : 'bg-white/5 text-slate-300')}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white/90 flex items-center gap-2">
              {role.name}
              {role.isSystem && <span className="text-[10px] uppercase tracking-widest text-primary">sistema</span>}
            </h3>
            {role.description && <p className="text-sm text-slate-400">{role.description}</p>}
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
          <Users size={14} /> {role.usersCount} usuario{role.usersCount === 1 ? '' : 's'}
        </span>
      </div>

      <PermissionPicker
        permissions={permissions}
        selected={selected}
        onChange={setSelected}
        disabled={!canManage}
        lockedKeys={role.isSystem ? [PERM.USERS_MANAGE] : []}
      />

      {canManage && (
        <div className="flex justify-between items-center">
          <button
            onClick={remove}
            disabled={role.isSystem || role.usersCount > 0}
            title={role.isSystem ? 'Rol del sistema' : role.usersCount > 0 ? 'Reasigna sus usuarios antes de eliminarlo' : 'Eliminar rol'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Trash2 size={16} /> Eliminar
          </button>
          <button
            onClick={save}
            disabled={!dirty || updateRole.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-40"
          >
            <Save size={16} /> Guardar permisos
          </button>
        </div>
      )}
    </div>
  )
}
