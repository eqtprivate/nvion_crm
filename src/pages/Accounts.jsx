import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Building2, MoreVertical, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AccountDialog from '../components/forms/AccountDialog';
import EditAccountDialog from '../components/forms/EditAccountDialog';
import AccountKPICard from '../components/accounts/AccountKPICard';
import AccountInsightsDialog from '../components/accounts/AccountInsightsDialog';
import { useAuth } from '@/lib/AuthContext';
import { formatCpfCnpj, formatCurrency, formatPhone } from '@/components/forms/MaskedInputs';

const statusLabel = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  em_analise: 'Em análise',
  suspensa: 'Suspensa',
};

export default function Accounts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', empresa],
    queryFn: async () => { const all = await db.Account.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); },
    enabled: !!empresa,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', empresa],
    queryFn: async () => { const all = await db.Opportunity.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); },
    enabled: !!empresa,
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.Account.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', empresa] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', empresa] });
      setEditDialogOpen(false);
      setSelectedAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', empresa] });
    },
  });

  const filteredAccounts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return accounts.filter(account => (
      account.name?.toLowerCase().includes(term) ||
      account.cnpj?.toLowerCase().includes(term) ||
      formatCpfCnpj(account.cnpj).toLowerCase().includes(term) ||
      account.contato?.toLowerCase().includes(term) ||
      account.email?.toLowerCase().includes(term) ||
      account.telefone?.toLowerCase().includes(term)
    ));
  }, [accounts, searchTerm]);

  const kpis = useMemo(() => {
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => a.status === 'ativa').length;
    const keyAccounts = accounts.filter(a => a.status === 'ativa').length;
    const totalRevenue = opportunities
      .filter(o => o.status === 'ganha')
      .reduce((sum, o) => sum + (o.valor_carta || 0), 0);
    const overdueAccounts = accounts.filter(a => a.status === 'em_analise').length;

    return { totalAccounts, activeAccounts, keyAccounts, totalRevenue, overdueAccounts };
  }, [accounts, opportunities]);

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setEditDialogOpen(true);
  };

  const handleViewInsights = (account) => {
    setSelectedAccount(account);
    setInsightsDialogOpen(true);
  };

  const exportToCSV = () => {
    if (accounts.length === 0) return;
    const headers = ['Nome', 'CNPJ', 'Contato', 'Email', 'Telefone', 'Prazo Médio Pagamento', 'Status'];
    const rows = filteredAccounts.map(account => [
      account.name || '',
      formatCpfCnpj(account.cnpj) || '',
      account.contato || '',
      account.email || '',
      formatPhone(account.telefone) || '',
      account.prazo_medio_pagamento || '',
      account.status || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `administradoras_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statusColors = {
    ativa: 'bg-green-100 text-green-800',
    inativa: 'bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-200',
    em_analise: 'bg-yellow-100 text-yellow-800',
    suspensa: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Administradoras</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={accounts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary-dark" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Administradora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <AccountKPICard title="Total de Administradoras" value={kpis.totalAccounts} trend="up" trendValue="+2%" chartData={[50, 60, 55, 70, 65, 75]} color="blue" />
        <AccountKPICard title="Ativas" value={kpis.activeAccounts} trend="up" trendValue="+2%" chartData={[55, 60, 58, 68, 65, 72]} color="green" />
        <AccountKPICard title="Principais Parceiras" value={kpis.keyAccounts} trend="up" trendValue="+5%" chartData={[40, 45, 50, 55, 58, 62]} color="cyan" />
        <AccountKPICard title="Volume Total" value={formatCurrency(kpis.totalRevenue)} trend="up" trendValue="+3.6%" chartData={[60, 65, 70, 75, 78, 82]} color="purple" />
        <AccountKPICard title="Atividades Vencidas" value={kpis.overdueAccounts} chartData={[30, 35, 40, 38, 42, 45]} color="red" />
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar administradoras..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Prazo Médio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">Carregando...</TableCell></TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400"><div className="flex flex-col items-center gap-2"><Building2 className="w-12 h-12 text-gray-300" /><span className="font-medium">Nenhuma administradora encontrada</span></div></TableCell></TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id} className="hover:bg-gray-50 dark:hover:bg-muted/40 cursor-pointer" onClick={() => handleViewInsights(account)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhone(account.telefone) || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{formatCpfCnpj(account.cnpj) || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{account.contato || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{account.email || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{account.prazo_medio_pagamento ? `${account.prazo_medio_pagamento} dias` : '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[account.status] || 'bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-200'}>
                        {statusLabel[account.status] || account.status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(account); }}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(account.id); }}>Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      <EditAccountDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} account={selectedAccount} onSubmit={(data) => updateMutation.mutate({ id: selectedAccount.id, data })} isLoading={updateMutation.isPending} />
      <AccountInsightsDialog open={insightsDialogOpen} onOpenChange={setInsightsDialogOpen} account={selectedAccount} activities={[]} contacts={[]} opportunities={opportunities} />
    </div>
  );
}
