'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, UserPlus, Users, X } from 'lucide-react';
import { api, type PaginationMeta } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const PAGE_SIZE = 15;
const ROLES = ['admin', 'auditor', 'viewer'] as const;

const emptyCreateForm = { email: '', password: '', name: '', role: 'auditor' };

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'auditor', password: '' });
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    try {
      const result = await api.listUsers(token, { page, pageSize: PAGE_SIZE });
      setUsers(result.data);
      setMeta(result.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditForm({ name: user.name, role: user.role, password: '' });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: '', role: 'auditor', password: '' });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      await api.createUser(token, form);
      setForm(emptyCreateForm);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar usuário');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editingId) return;
    setSaving(true);
    setError('');
    try {
      const body: { name?: string; role?: string; password?: string } = {
        name: editForm.name.trim(),
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        body.password = editForm.password;
      }
      const updated = await api.updateUser(token, editingId, body);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-400">
          Acesso restrito a administradores.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Administração</h1>
        <p className="text-slate-400">Gestão de usuários e papéis (RBAC)</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold">Usuários</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-400">Carregando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2 pr-4">E-mail</th>
                    <th className="pb-2 pr-4">Papel</th>
                    <th className="pb-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {users.map((u) =>
                    editingId === u.id ? (
                      <tr key={u.id} className="border-t border-white/5">
                        <td colSpan={4} className="py-3">
                          <form
                            onSubmit={handleSaveEdit}
                            className="grid gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 sm:grid-cols-2"
                          >
                            <div className="sm:col-span-2">
                              <p className="text-xs text-slate-500">Editando {u.email}</p>
                            </div>
                            <input
                              required
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
                            />
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <input
                              type="password"
                              minLength={12}
                              placeholder="Nova senha (opcional, mín. 12 caracteres)"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 sm:col-span-2"
                            />
                            <div className="flex flex-wrap gap-2 sm:col-span-2">
                              <Button type="submit" loading={saving}>
                                Salvar alterações
                              </Button>
                              <Button type="button" variant="ghost" onClick={cancelEdit}>
                                <X className="h-4 w-4" />
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={u.id} className="border-t border-white/5">
                        <td className="py-2 pr-4">{u.name}</td>
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4 capitalize">{u.role}</td>
                        <td className="py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => startEdit(u)}
                            aria-label={`Editar ${u.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
          {meta && <Pagination meta={meta} onPageChange={setPage} className="mt-4" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold">Novo usuário</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <input
              required
              type="text"
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
            <input
              required
              type="email"
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
            <input
              required
              type="password"
              minLength={12}
              placeholder="Senha (mín. 12 caracteres)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <Button type="submit" loading={creating}>
                Criar usuário
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {currentUserId && (
        <p className="text-xs text-slate-500">
          Dica: após alterar seu próprio papel, faça logout e login novamente para atualizar permissões
          na sessão.
        </p>
      )}
    </div>
  );
}
