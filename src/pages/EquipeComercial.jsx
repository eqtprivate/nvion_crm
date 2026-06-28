import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function EquipeComercial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nome_equipe: '',
    lider_responsavel: '',
    meta_mensal: '',
    status: 'ativo',
  });
  const queryClient = useQueryClient();

  const { data: equipes = [], isLoading } = useQuery({
    queryKey: ['equipes'],
    queryFn: () => base44.entities.EquipeComercial.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EquipeComercial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes'] });
      setDialogOpen(false);
      setForm({ nome_equipe: '', lider_responsavel: '', meta_mensal: '', status: 'ativo' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EquipeComercial.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes'] });
    },
  });

  const filtered = equipes.filter(e =>
    e.nome_equipe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.lider_responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const kpis = {
    total: equipes.length,
    ativas: equipes.filter(e => e.status === 'ativo').length,
    totalVendedores: equipes.reduce((sum, e) => sum + (e.vendedores_vinculados?.length || 0), 0),
    metaTotal: equipes.reduce((sum, e) => sum + (e.meta_mensal || 0), 0),
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : undefined,
      vendedores_vinculados: [],
    });
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Equipe Comercial</h1>
          <p className="text-gray-500 mt-1">Gerencie suas equipes e metas comerciais</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary-dark w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Equipe
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total de Equipes</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Equipes Ativas</p>
            <p className="text-2xl font-bold text-green-600">{kpis.ativas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total de Vendedores</p>
            <p className="text-2xl font-bold text-blue-600">{kpis.totalVendedores}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Meta Total (R$)</p>
            <p className="text-2xl font-bold text-primary">{kpis.metaTotal.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar equipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead>Nome da Equipe</TableHead>
                <TableHead>Líder Responsável</TableHead>
                <TableHead>Vendedores</TableHead>
                <TableHead>Meta Mensal (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <span className="font-medium">Nenhuma equipe encontrada</span>
                      <span className="text-sm">Crie sua primeira equipe comercial acima</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((equipe) => (
                  <TableRow key={equipe.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <p className="font-medium">{equipe.nome_equipe}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{equipe.lider_responsavel || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {equipe.vendedores_vinculados?.length || 0} vendedor(es)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {equipe.meta_mensal
                          ? `R$ ${equipe.meta_mensal.toLocaleString('pt-BR')}`
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={equipe.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {equipe.status === 'ativo' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(equipe.id)}
                          >
                            Excluir
                          </DropdownMenuItem>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Equipe Comercial</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome_equipe">Nome da Equipe *</Label>
              <Input
                id="nome_equipe"
                value={form.nome_equipe}
                onChange={(e) => setForm(prev => ({ ...prev, nome_equipe: e.target.value }))}
                placeholder="Ex: Equipe Sul"
                required
              />
            </div>
            <div>
              <Label htmlFor="lider">Líder Responsável</Label>
              <Input
                id="lider"
                value={form.lider_responsavel}
                onChange={(e) => setForm(prev => ({ ...prev, lider_responsavel: e.target.value }))}
                placeholder="Nome do líder"
              />
            </div>
            <div>
              <Label htmlFor="meta">Meta Mensal (R$)</Label>
              <Input
                id="meta"
                type="number"
                value={form.meta_mensal}
                onChange={(e) => setForm(prev => ({ ...prev, meta_mensal: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-dark" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Criar Equipe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
