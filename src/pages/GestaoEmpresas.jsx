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
import { Plus, Search, Building2, MoreVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PhoneInput, CpfCnpjInput } from '@/components/forms/MaskedInputs';
import { usePlanos, maxUsuarios } from '@/lib/usePlanos';

const STATUS_LIST = ['em_implantacao', 'ativa', 'em_analise', 'elegivel_para_credito', 'suspensa', 'inativa'];
const STATUS_LABEL = {
  em_implantacao: 'Em implantação',
  ativa: 'Ativa',
  em_analise: 'Em análise',
  elegivel_para_credito: 'Elegível para crédito',
  suspensa: 'Suspensa',
  inativa: 'Inativa',
};
const STATUS_COLORS = {
  em_implantacao: 'bg-yellow-100 text-yellow-800',
  ativa: 'bg-green-100 text-green-800',
  em_analise: 'bg-blue-100 text-blue-800',
  elegivel_para_credito: 'bg-purple-100 text-purple-800',
  suspensa: 'bg-orange-100 text-orange-800',
  inativa: 'bg-gray-100 text-gray-500',
};

const UF_LIST = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const emptyForm = {
  razao_social: '', nome_fantasia: '', cnpj: '', logo_url: '', website: '',
  email: '', telefone: '', responsavel_principal: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '',
  status: 'em_implantacao', plano_contratado: '', data_inicio_plataforma: '',
  elegivel_antecipacao: false, limite_atual_sugerido: '', limite_utilizado: '', limite_disponivel: '',
  observacoes_internas: '',
};

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function EmpresaDialog({ open, onOpenChange, empresa, onSubmit, loading, planos }) {
  const [form, setForm] = useState(emptyForm);
  React.useEffect(() => { setForm(empresa ? { ...emptyForm, ...empresa } : emptyForm); }, [empresa, open]);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const { data: usuariosEmpresa = [] } = useQuery({
    queryKey: ['usuariosEmpresaDialog', empresa?.id],
    queryFn: async () => {
      const all = await base44.entities.UsuarioAcesso.list();
      return all.filter(u =>
        u.empresa_vinculada === empresa?.razao_social ||
        u.empresa_vinculada === empresa?.nome_fantasia
      );
    },
    enabled: Boolean(empresa?.id),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      limite_atual_sugerido: Number(form.limite_atual_sugerido || 0),
      limite_utilizado: Number(form.limite_utilizado || 0),
      limite_disponivel: Number(form.limite_disponivel || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{empresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados Principais</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><Label>Razão Social *</Label><Input required value={form.razao_social} onChange={(e) => set('razao_social', e.target.value)} /></div>
              <div><Label>CNPJ</Label><CpfCnpjInput value={form.cnpj} onChange={(v) => set('cnpj', v)} /></div>
              <div><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></div>
              <div>
                <Label>Responsável principal</Label>
                {empresa?.id && usuariosEmpresa.length > 0 ? (
                  <Select value={form.responsavel_principal} onValueChange={(v) => set('responsavel_principal', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                    <SelectContent>
                      {usuariosEmpresa.map((u) => (
                        <SelectItem key={u.id} value={u.display_name}>{u.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.responsavel_principal} onChange={(e) => set('responsavel_principal', e.target.value)} placeholder="Nome do responsável" />
                )}
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div><Label>Telefone</Label><PhoneInput value={form.telefone} onChange={(v) => set('telefone', v)} /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></div>
              <div className="md:col-span-3"><Label>URL do Logotipo</Label><Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Endereço</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>CEP</Label><Input value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" /></div>
              <div className="md:col-span-2"><Label>Logradouro</Label><Input value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} /></div>
              <div><Label>Número</Label><Input value={form.numero} onChange={(e) => set('numero', e.target.value)} /></div>
              <div><Label>Complemento</Label><Input value={form.complemento} onChange={(e) => set('complemento', e.target.value)} /></div>
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
              <div><Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Plano & Crédito</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Plano contratado</Label>
                <Select value={form.plano_contratado} onValueChange={(v) => set('plano_contratado', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                  <SelectContent>
                    {(planos || []).map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>{p.label} — até {maxUsuarios(p) === Infinity ? 'ilimitado' : maxUsuarios(p)} usuários</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data início plataforma</Label><Input type="date" value={form.data_inicio_plataforma} onChange={(e) => set('data_inicio_plataforma', e.target.value)} /></div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="elegivel" checked={form.elegivel_antecipacao} onChange={(e) => set('elegivel_antecipacao', e.target.checked)} className="w-4 h-4" />
                <Label htmlFor="elegivel">Elegível antecipação</Label>
              </div>
              <div><Label>Limite sugerido (R$)</Label><Input type="number" value={form.limite_atual_sugerido} onChange={(e) => set('limite_atual_sugerido', e.target.value)} /></div>
              <div><Label>Limite utilizado (R$)</Label><Input type="number" value={form.limite_utilizado} onChange={(e) => set('limite_utilizado', e.target.value)} /></div>
              <div><Label>Limite disponível (R$)</Label><Input type="number" value={form.limite_disponivel} onChange={(e) => set('limite_disponivel', e.target.value)} /></div>
              <div className="md:col-span-3"><Label>Observações internas</Label><Input value={form.observacoes_internas} onChange={(e) => set('observacoes_internas', e.target.value)} /></div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function GestaoEmpresas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: planos = [] } = usePlanos();

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Empresa.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); setDialogOpen(false); setSelected(null); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empresa.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); setDialogOpen(false); setSelected(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Empresa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['empresas'] }),
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return empresas.filter((e) => {
      if (filterStatus !== 'todos' && e.status !== filterStatus) return false;
      if (term && !e.razao_social?.toLowerCase().includes(term) && !e.nome_fantasia?.toLowerCase().includes(term) && !e.cnpj?.includes(term)) return false;
      return true;
    });
  }, [empresas, filterStatus, searchTerm]);

  const kpis = useMemo(() => ({
    total: empresas.length,
    ativas: empresas.filter((e) => e.status === 'ativa').length,
    elegiveis: empresas.filter((e) => e.elegivel_antecipacao).length,
    limiteTotal: empresas.reduce((s, e) => s + (e.limite_atual_sugerido || 0), 0),
  }), [empresas]);

  const handleSubmit = (data) => {
    selected?.id ? updateMutation.mutate({ id: selected.id, data }) : createMutation.mutate(data);
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        Acesso restrito a super administradores.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestão de Empresas</h1>
          <p className="text-gray-500 mt-1">Clientes da plataforma NVION CRM</p>
        </div>
        <Button onClick={() => { setSelected(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nova Empresa
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Empresas</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Ativas</p><p className="text-2xl font-bold text-green-700">{kpis.ativas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Elegíveis Antecipação</p><p className="text-2xl font-bold text-purple-700">{kpis.elegiveis}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Limite Total Sugerido</p><p className="text-xl font-bold text-primary">{money(kpis.limiteTotal)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar por razão social, nome fantasia ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Limite Sugerido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando empresas...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Nenhuma empresa encontrada
                  </TableCell>
                </TableRow>
              ) : filtered.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {emp.logo_url ? (
                        <img src={emp.logo_url} alt="logo" className="w-8 h-8 rounded object-contain border" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-400" /></div>
                      )}
                      <div>
                        <div className="font-medium">{emp.nome_fantasia || emp.razao_social}</div>
                        {emp.nome_fantasia && <div className="text-xs text-gray-400">{emp.razao_social}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{emp.cnpj || '-'}</TableCell>
                  <TableCell>{emp.responsavel_principal || '-'}</TableCell>
                  <TableCell>{emp.cidade ? `${emp.cidade}/${emp.estado}` : '-'}</TableCell>
                  <TableCell>{emp.plano_contratado ? (planos.find((p) => p.slug === emp.plano_contratado)?.label || emp.plano_contratado) : '-'}</TableCell>
                  <TableCell>{emp.limite_atual_sugerido ? money(emp.limite_atual_sugerido) : '-'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[emp.status] || ''}>{STATUS_LABEL[emp.status] || emp.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(emp); setDialogOpen(true); }}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm(`Excluir ${emp.razao_social}?`)) deleteMutation.mutate(emp.id); }}>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <EmpresaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresa={selected}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        planos={planos}
      />
    </div>
  );
}