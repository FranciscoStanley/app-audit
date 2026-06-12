'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
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

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'auditor' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token || !isAdmin) return;
    setLoading(true);
    api
      .listUsers(token, { page, pageSize: PAGE_SIZE })
      .then((result) => {
        setUsers(result.data);
        setMeta(result.meta);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar usuários'))
      .finally(() => setLoading(false));
  }, [token, isAdmin, page]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      const created = await api.createUser(token, form);
      setUsers((prev) => [...prev, created]);
      setForm({ email: '', password: '', name: '', role: 'auditor' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar usuário');
    } finally {
      setCreating(false);
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
                    <th className="pb-2">Papel</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5">
                      <td className="py-2 pr-4">{u.name}</td>
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 capitalize">{u.role}</td>
                    </tr>
                  ))}
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
              minLength={8}
              placeholder="Senha (mín. 8 caracteres)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            >
              <option value="admin">admin</option>
              <option value="auditor">auditor</option>
              <option value="viewer">viewer</option>
            </select>
            <div className="sm:col-span-2">
              <Button type="submit" loading={creating}>
                Criar usuário
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
