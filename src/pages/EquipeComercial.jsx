import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, MoreVertical, UserCircle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MoneyInput, formatCurrency } from '@/components/forms/MaskedInputs';
import { FieldError } from '@/components/forms/FieldError';
import { validate, equipeComercialSchema } from '@/lib/validation';

export default function EquipeComercial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipe, setSelectedEquipe] = useState(null);
  const [form, setForm] = useState({
    nome_equipe: '',
    lider_responsavel: '',
    meta_mensal: '',
    status: 'ativo',
  });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const isLider = user?.role === 'lider_comercial';
  const canManageTeams = ['super_admin', 'admin_empresa', 'gestor_comercial'].includes(user?.role);

  const { data: allEquipes = [], isLoading } = useQuery({
    queryKey: ['equipes', empresa],
    queryFn: async () => { const all = await db.EquipeComercial.list('-created_date'); return all.filter(r => r.empresa_vinculada === empresa); },
    enabled: !!empresa,
  });

  const equipes = isLider
    ? allEquipes.filter(e => e.lider_responsavel === user.display_name)
    : allEquipes;

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores', empresa],
    queryFn: async () => {
      const all = await db.Vendedores.list('-created_date');
      return all.filter((item) => item.empresa_vinculada === empresa);
    },
    enabled: !!empresa,
  });

  const resetForm = () => { setForm({ nome_equipe: '', lider_responsavel: '', meta_mensal: '', status: 'ativo' }); setErrors({}); };

  const getVendedoresEquipe = (nomeEquipe) => vendedores
    .filter((vendedor) => vendedor.equipe === nomeEquipe)
    .map((vendedor) => vendedor.nome)
    .filter(Boolean);

  const openCreateDialog = () => {
    setSelectedEquipe(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (equipe) => {
    setSelectedEquipe(equipe);
    setForm({
      nome_equipe: equipe.nome_equipe || '',
      lider_responsavel: equipe.lider_responsavel || '',
      meta_mensal: equipe.meta_mensal || '',
      status: equipe.status || 'ativo',
    });
    setDialogOpen(true);
  };

  const closeDialog = (open) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedEquipe(null);
      resetForm();
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => db.EquipeComercial.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes', empresa] });
      setDialogOpen(false);
      setSelectedEquipe(null);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, previousName }) => {
      const equipe = await db.EquipeComercial.update(id, data);
      if (previousName && data.nome_equipe && data.nome_equipe !== previousName) {
        const allVendedores = await db.Vendedores.list('-created_date');
        const vinculados = allVendedores.filter((vendedor) =>
          vendedor.empresa_vinculada === empresa && vendedor.equipe === previousName
        );
        await Promise.all(vinculados.map((vendedor) =>
          db.Vendedores.update(vendedor.id, { equipe: data.nome_equipe })
        ));
      }
      return equipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes', empresa] });
      queryClient.invalidateQueries({ queryKey: ['vendedores', empresa] });
      setDialogOpen(false);
      setSelectedEquipe(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.EquipeComercial.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes', empresa] });
    },
  });

  const filtered = equipes.filter(e =>
    e.nome_equipe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.lider_responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getVendedoresEquipe(e.nome_equipe).some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const kpis = {
    total: equipes.length,
    ativas: equipes.filter(e => e.status === 'ativo').length,
    totalVendedores: vendedores.filter((vendedor) => vendedor.equipe).length,
    metaTotal: equipes.reduce((sum, e) => sum + (e.meta_mensal || 0), 0),
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { ok, errors: errs } = validate(equipeComercialSchema, form);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    const payload = {
      nome_equipe: form.nome_equipe,
      lider_responsavel: form.lider_responsavel,
      meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : undefined,
      status: form.status,
      vendedores_vinculados: getVendedoresEquipe(selectedEquipe?.nome_equipe || form.nome_equipe),
    };

    if (selectedEquipe?.id) updateMutation.mutate({ id: selectedEquipe.id, data: payload, previousName: selectedEquipe.nome_equipe });
    else createMutation.mutate(payload);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Equipe e Vendedores</h1>
          <p className="text-gray-500 mt-1">Gestão de líderes, vendedores, equipes comerciais e metas</p>
        </div>
        {canManageTeams && (
          <Button size="sm" className="bg-primary hover:bg-primary-dark w-full sm:w-auto" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Equipe
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Equipes</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Equipes Ativas</p><p className="text-2xl font-bold text-green-600">{kpis.ativas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Vendedores</p><p className="text-2xl font-bold text-blue-600">{kpis.totalVendedores}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Meta Total</p><p className="text-2xl font-bold text-primary">{formatCurrency(kpis.metaTotal)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input placeholder="Buscar equipes, líderes ou vendedores..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead>Nome da Equipe</TableHead>
                <TableHead>Líder Responsável</TableHead>
                <TableHead>Vendedores</TableHead>
                <TableHead>Meta Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500"><div className="flex flex-col items-center gap-2"><Users className="w-12 h-12 text-gray-300" /><span className="font-medium">Nenhuma equipe encontrada</span><span className="text-sm">Crie uma equipe comercial para organizar líderes e vendedores</span></div></TableCell></TableRow>
              ) : (
                filtered.map((equipe) => {
                  const vendedoresEquipe = getVendedoresEquipe(equipe.nome_equipe);
                  return (
                    <TableRow key={equipe.id} className="hover:bg-gray-50">
                      <TableCell><div className="flex items-center gap-3"><div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-primary" /></div><p className="font-medium">{equipe.nome_equipe}</p></div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><UserCircle className="w-4 h-4 text-gray-400" /><span className="text-sm">{equipe.lider_responsavel || '-'}</span></div></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{vendedoresEquipe.length ? vendedoresEquipe.map((vendedor) => <Badge key={vendedor} variant="outline">{vendedor}</Badge>) : <Badge variant="outline">0 vendedor(es)</Badge>}</div></TableCell>
                      <TableCell><span className="font-medium">{equipe.meta_mensal ? formatCurrency(equipe.meta_mensal) : '-'}</span></TableCell>
                      <TableCell><Badge className={equipe.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{equipe.status === 'ativo' ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                      {canManageTeams && (
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEditDialog(equipe)}>Editar</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(equipe.id)}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedEquipe ? 'Editar Equipe Comercial' : 'Nova Equipe Comercial'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="nome_equipe">Nome da Equipe *</Label><Input id="nome_equipe" value={form.nome_equipe} onChange={(e) => setForm(prev => ({ ...prev, nome_equipe: e.target.value }))} placeholder="Ex: Equipe Sul" /><FieldError message={errors.nome_equipe} /></div>
            <div>
              <Label htmlFor="lider">Líder Responsável</Label>
              <Select value={form.lider_responsavel || ''} onValueChange={(value) => setForm(prev => ({ ...prev, lider_responsavel: value }))}>
                <SelectTrigger id="lider"><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger>
                <SelectContent>
                  {vendedores.filter((vendedor) => vendedor.nome).map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.nome}>{vendedor.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendedores Vinculados</Label>
              <div className="min-h-10 rounded-md border border-input bg-gray-50 px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {getVendedoresEquipe(selectedEquipe?.nome_equipe || form.nome_equipe).length ? (
                    getVendedoresEquipe(selectedEquipe?.nome_equipe || form.nome_equipe).map((vendedor) => <Badge key={vendedor} variant="outline">{vendedor}</Badge>)
                  ) : (
                    <span className="text-sm text-gray-500">Nenhum vendedor vinculado</span>
                  )}
                </div>
              </div>
            </div>
            <div><Label htmlFor="meta">Meta Mensal</Label><MoneyInput id="meta" value={form.meta_mensal} onChange={(value) => setForm(prev => ({ ...prev, meta_mensal: value }))} /></div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="ativo">Ativa</option>
                <option value="inativo">Inativa</option>
              </select>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => closeDialog(false)}>Cancelar</Button><Button type="submit" className="bg-primary hover:bg-primary-dark" disabled={isSaving}>{isSaving ? 'Salvando...' : selectedEquipe ? 'Salvar Alterações' : 'Criar Equipe'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
