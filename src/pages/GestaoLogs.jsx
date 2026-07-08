import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { isAdminRole } from '@/lib/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollText, RefreshCw, Filter } from 'lucide-react';

const ACTION_LABELS = {
  login: 'Login',
  logout: 'Logout',
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  bulk_create: 'Criação em lote',
  admin_create_user: 'Criou usuário',
  admin_reset_temp_password: 'Redefiniu senha temp.',
};

const ACTION_COLORS = {
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-slate-100 text-slate-600',
  create: 'bg-green-100 text-green-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  bulk_create: 'bg-green-100 text-green-700',
  admin_create_user: 'bg-indigo-100 text-indigo-700',
  admin_reset_temp_password: 'bg-indigo-100 text-indigo-700',
};

const PAGE_SIZE = 50;

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return value;
  }
}

export default function GestaoLogs() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [logs, setLogs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ action: '', entity: '' });

  const load = async () => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action, entity, entity_id, empresa_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entity) query = query.ilike('entity', `%${filters.entity}%`);

    const { data, error: qErr } = await query;
    if (qErr) {
      setError(qErr.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs(data || []);

    // Busca nomes dos usuários envolvidos.
    const userIds = [...new Set((data || []).map((l) => l.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);
      const map = {};
      (profs || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.action]);

  const actionOptions = useMemo(() => Object.entries(ACTION_LABELS), []);

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-gray-500">
          <ScrollText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Área restrita a administradores.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" /> Logs de Auditoria
          </h1>
          <p className="text-gray-500 mt-1">Registro de acessos e alterações de dados.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Filter className="w-4 h-4" /> Filtros:</div>
          <div>
            <select
              value={filters.action}
              onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, action: e.target.value })); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Todas as ações</option>
              {actionOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Entidade (ex.: Lead)"
              value={filters.entity}
              onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); load(); } }}
              className="h-9 text-sm w-48"
            />
            <Button size="sm" variant="secondary" onClick={() => { setPage(0); load(); }}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          Erro ao carregar logs: {error}
          <span className="block text-red-500 text-xs mt-1">Verifique se a migração de políticas de audit_logs foi aplicada no Supabase.</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Data/Hora</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                  <th className="px-4 py-3 font-medium">Entidade</th>
                  <th className="px-4 py-3 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                ) : (
                  logs.map((log) => {
                    const prof = profiles[log.user_id];
                    return (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{formatDateTime(log.created_at)}</td>
                        <td className="px-4 py-2.5 text-gray-800">{prof?.display_name || prof?.email || <span className="text-gray-400">{log.user_id?.slice(0, 8) || '—'}</span>}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{log.entity || '—'}{log.entity_id ? <span className="text-gray-400 text-xs"> #{String(log.entity_id).slice(0, 8)}</span> : null}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">
                          {log.metadata && Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">Página {page + 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE || loading} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}
