import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, UserRound, MoreVertical, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CpfCnpjInput, MoneyInput, PhoneInput, formatCpfCnpj, formatCurrency, formatPhone } from '@/components/forms/MaskedInputs';
import { FieldError } from '@/components/forms/FieldError';
import { validate, vendedorSchema } from '@/lib/validation';

const emptyForm = {
  nome: '',
  email: '',
  telefone: '',
  cpf_cnpj: '',
  equipe: '',
  lider: '',
  tipo_vendedor: 'interno',
  meta_mensal: '',
  status: 'ativo',
  data_inicio: '',
  observacoes: '',
};

const statusLabel = { ativo: 'Ativo', inativo: 'Inativo', suspenso: 'Suspenso' };
const tipoLabel = { interno: 'Interno', parceiro: 'Parceiro', corban: 'Corban', lider: 'Líder' };

function money(value) {
  return formatCurrency(value);
}

function VendedorDialog({ open, onOpenChange, vendedor, equipes, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    setForm(vendedor ? { ...emptyForm, ...vendedor } : emptyForm);
    setErrors({});
  }, [vendedor, open]);

  const handleEquipe = (nomeEquipe) => {
    const equipe = equipes.find((item) => item.nome_equipe === nomeEquipe);
    setForm({
      ...form,
      equipe: nomeEquipe,
      lider: equipe?.lider_responsavel || '',
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { ok, errors: errs } = validate(vendedorSchema, form);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    const equipeSelecionada = equipes.find((item) => item.nome_equipe === form.equipe);
    onSubmit({
      ...form,
      lider: equipeSelecionada?.lider_responsavel || '',
      meta_mensal: form.meta_mensal ? Number(form.meta_mensal) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <FieldError message={errors.nome} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FieldError message={errors.email} />
            </div>
            <div>
              <Label>Telefone</Label>
              <PhoneInput value={form.telefone || ''} onChange={(value) => setForm({ ...form, telefone: value })} />
              <FieldError message={errors.telefone} />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <CpfCnpjInput value={form.cpf_cnpj || ''} onChange={(value) => setForm({ ...form, cpf_cnpj: value })} />
              <FieldError message={errors.cpf_cnpj} />
            </div>
            <div>
              <Label>Equipe</Label>
              <Select value={form.equipe || ''} onValueChange={handleEquipe}>
                <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                <SelectContent>{equipes.map((item) => <SelectItem key={item.id} value={item.nome_equipe}>{item.nome_equipe}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Líder</Label>
              <Input value={form.lider || ''} readOnly disabled placeholder="Definido pela equipe" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo_vendedor} onValueChange={(value) => setForm({ ...form, tipo_vendedor: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                  <SelectItem value="corban">Corban</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta Mensal</Label>
              <MoneyInput value={form.meta_mensal || ''} onChange={(value) => setForm({ ...form, meta_mensal: value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Início</Label>
              <Input type="date" value={form.data_inicio || ''} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Observações</Label>
              <Input value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Vendedor'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Vendedores() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState(null);

  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ['vendedores', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.Vendedores.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const { data: equipes = [] } = useQuery({
    queryKey: ['equipes', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.EquipeComercial.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendedores.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores', empresa] });
      setDialogOpen(false);
      setSelectedVendedor(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendedores.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores', empresa] });
      setDialogOpen(false);
      setSelectedVendedor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendedores.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendedores', empresa] }),
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return vendedores.filter((item) =>
      item.nome?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.cpf_cnpj?.toLowerCase().includes(term) ||
      item.equipe?.toLowerCase().includes(term) ||
      item.lider?.toLowerCase().includes(term)
    );
  }, [vendedores, searchTerm]);

  const kpis = useMemo(() => ({
    total: vendedores.length,
    ativos: vendedores.filter((item) => item.status === 'ativo').length,
    lideres: vendedores.filter((item) => item.tipo_vendedor === 'lider').length,
    metaTotal: vendedores.reduce((sum, item) => sum + (item.meta_mensal || 0), 0),
  }), [vendedores]);

  const handleSubmit = (data) => {
    if (selectedVendedor?.id) updateMutation.mutate({ id: selectedVendedor.id, data });
    else createMutation.mutate(data);
  };

  const exportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Equipe', 'Líder', 'Tipo', 'Meta Mensal', 'Status'];
    const rows = filtered.map((item) => [item.nome, item.email, item.telefone, item.cpf_cnpj, item.equipe, item.lider, item.tipo_vendedor, item.meta_mensal, item.status]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vendedores.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-gray-500 mt-1">Gestão individual de vendedores, líderes, metas e vínculos comerciais</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button>
          <Button onClick={() => { setSelectedVendedor(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo Vendedor</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Vendedores</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Vendedores Ativos</p><p className="text-2xl font-bold text-green-700">{kpis.ativos}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Líderes</p><p className="text-2xl font-bold text-blue-700">{kpis.lideres}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Meta Total</p><p className="text-2xl font-bold text-primary">{money(kpis.metaTotal)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar vendedores..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead>CPF/CNPJ</TableHead><TableHead>Equipe</TableHead><TableHead>Líder</TableHead><TableHead>Tipo</TableHead><TableHead>Meta</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando vendedores...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-500"><UserRound className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhum vendedor encontrado</TableCell></TableRow> : filtered.map((vendedor) => (
                <TableRow key={vendedor.id}>
                  <TableCell><p className="font-medium">{vendedor.nome}</p><p className="text-xs text-gray-500">{vendedor.email || formatPhone(vendedor.telefone) || '-'}</p></TableCell>
                  <TableCell>{formatCpfCnpj(vendedor.cpf_cnpj) || '-'}</TableCell>
                  <TableCell>{vendedor.equipe || '-'}</TableCell>
                  <TableCell>{vendedor.lider || '-'}</TableCell>
                  <TableCell>{tipoLabel[vendedor.tipo_vendedor] || vendedor.tipo_vendedor || '-'}</TableCell>
                  <TableCell>{vendedor.meta_mensal ? money(vendedor.meta_mensal) : '-'}</TableCell>
                  <TableCell><Badge>{statusLabel[vendedor.status] || vendedor.status || '-'}</Badge></TableCell>
                  <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedVendedor(vendedor); setDialogOpen(true); }}>Editar</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(vendedor.id)}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <VendedorDialog open={dialogOpen} onOpenChange={setDialogOpen} vendedor={selectedVendedor} equipes={equipes} onSubmit={handleSubmit} loading={createMutation.isPending || updateMutation.isPending} />
    </div>
  );
}
