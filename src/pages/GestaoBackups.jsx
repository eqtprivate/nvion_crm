import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { isAdminRole } from '@/lib/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatabaseBackup, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(value) {
  if (!value) return '-';
  try { return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return value; }
}
function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function totalRegistros(tables) {
  if (!tables) return 0;
  return Object.values(tables).reduce((a, b) => a + (Number(b) || 0), 0);
}

export default function GestaoBackups() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: qErr } = await supabase
      .from('backups')
      .select('id, empresa_nome, backup_date, status, tables, size_bytes, error, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (qErr) setError(qErr.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  const handleDownload = async (id) => {
    setDownloading(id);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('backup-download', { body: { backup_id: id } });
      if (fnErr) throw fnErr;
      if (!data?.url) throw new Error('URL não retornada.');
      window.open(data.url, '_blank');
    } catch (err) {
      toast.error('Erro ao gerar download: ' + (err?.message || err));
    } finally {
      setDownloading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
          <DatabaseBackup className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Área restrita a administradores.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DatabaseBackup className="w-6 h-6 text-primary" /> Backups
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Snapshots diários dos dados por empresa (retenção de 7 dias).</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          Erro ao carregar backups: {error}
          <span className="block text-red-500 text-xs mt-1">Verifique se a migração de backups foi aplicada no Supabase.</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-border">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Registros</th>
                  <th className="px-4 py-3 font-medium">Tamanho</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum backup ainda. O primeiro será gerado no próximo ciclo diário.</td></tr>
                ) : (
                  rows.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:hover:bg-muted/30">
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDate(b.backup_date)}</td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{b.empresa_nome || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{totalRegistros(b.tables)}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatSize(b.size_bytes)}</td>
                      <td className="px-4 py-2.5">
                        <Badge className={b.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {b.status === 'ok' ? 'OK' : 'Falhou'}
                        </Badge>
                        {b.status !== 'ok' && b.error && (
                          <span className="block text-[11px] text-gray-400 mt-0.5 max-w-xs truncate" title={b.error}>{b.error}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {b.status === 'ok' && (
                          <Button size="sm" variant="outline" disabled={downloading === b.id} onClick={() => handleDownload(b.id)}>
                            <Download className="w-4 h-4 mr-1.5" /> {downloading === b.id ? '...' : 'Baixar'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
