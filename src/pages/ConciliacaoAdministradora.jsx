import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { applyAccessFilter, useTeamMembers } from '@/lib/accessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle2, Download, FileCheck, MoreVertical, Search, Upload } from 'lucide-react';
import { formatCurrency } from '@/components/forms/MaskedInputs';

const STATUS_LABEL = {
  pendente: 'Pendente',
  conciliada: 'Conciliada',
  divergente: 'Divergente',
  nao_encontrada: 'Não encontrada',
  duplicada: 'Duplicada',
  ignorada: 'Ignorada',
};

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  conciliada: 'bg-green-100 text-green-800',
  divergente: 'bg-red-100 text-red-800',
  nao_encontrada: 'bg-gray-100 text-gray-700',
  duplicada: 'bg-orange-100 text-orange-800',
  ignorada: 'bg-slate-100 text-slate-700',
};

const DIVERGENCIA_LABEL = {
  nenhuma: 'Nenhuma',
  valor_carta: 'Valor da carta',
  valor_comissao: 'Valor da comissão',
  cliente: 'Cliente',
  grupo_cota: 'Grupo/Cota',
  produto: 'Produto',
  duplicidade: 'Duplicidade',
  nao_encontrada: 'Não encontrada',
  outro: 'Outro',
};

const FIELD_MAP = {
  cliente: ['cliente', 'nome', 'nome_cliente', 'consorciado'],
  cpf_cnpj: ['cpf', 'cnpj', 'cpf_cnpj', 'documento'],
  grupo: ['grupo', 'grp'],
  cota: ['cota', 'quota'],
  produto: ['produto', 'tipo', 'categoria'],
  valor_carta: ['valor_carta', 'valor_credito', 'credito', 'valor'],
  comissao: ['comissao', 'valor_comissao', 'comissao_total', 'repasse'],
  data_venda: ['data_venda', 'dt_venda', 'data'],
  data_pagamento: ['data_pagamento', 'data_prevista_pagamento', 'previsao_pagamento'],
};

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeHeader = (value) => normalize(value).replace(/\s+/g, '_');
const money = (value) => formatCurrency(value || 0);
const closeMoney = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) <= 1;

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return headers.reduce((row, header, index) => ({ ...row, [header]: cells[index] || '' }), {});
  });
}

function pick(row, field) {
  const aliases = FIELD_MAP[field] || [];
  const found = aliases.find((alias) => row[normalizeHeader(alias)] !== undefined);
  return found ? row[normalizeHeader(found)] : '';
}

function parseNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  return Number(normalized) || 0;
}

function parseDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function mapReportRow(row) {
  return {
    cliente: pick(row, 'cliente'),
    cpf_cnpj: pick(row, 'cpf_cnpj'),
    grupo: pick(row, 'grupo'),
    cota: pick(row, 'cota'),
    produto: pick(row, 'produto'),
    valor_carta: parseNumber(pick(row, 'valor_carta')),
    comissao: parseNumber(pick(row, 'comissao')),
    data_venda: parseDate(pick(row, 'data_venda')),
    data_pagamento: parseDate(pick(row, 'data_pagamento')),
  };
}

function getVendaComissao(venda, comissoes) {
  return comissoes.find((comissao) => comissao.venda_vinculada === venda?.id);
}

function findCandidates(row, administradora, vendas) {
  const byGrupoCota = vendas.filter((venda) =>
    normalize(venda.administradora) === normalize(administradora) &&
    normalize(venda.grupo) === normalize(row.grupo) &&
    normalize(venda.cota) === normalize(row.cota) &&
    normalize(row.grupo) &&
    normalize(row.cota)
  );
  if (byGrupoCota.length > 0) return byGrupoCota;

  const byClienteValor = vendas.filter((venda) =>
    normalize(venda.administradora) === normalize(administradora) &&
    normalize(venda.cliente) === normalize(row.cliente) &&
    closeMoney(venda.valor_carta, row.valor_carta) &&
    normalize(row.cliente)
  );
  if (byClienteValor.length > 0) return byClienteValor;

  return vendas.filter((venda) =>
    normalize(venda.produto) === normalize(row.produto) &&
    closeMoney(venda.valor_carta, row.valor_carta) &&
    normalize(row.produto)
  );
}

function classifyRow(row, administradora, vendas, comissoes) {
  const candidates = findCandidates(row, administradora, vendas);
  if (candidates.length === 0) {
    return { status: 'nao_encontrada', divergencia: 'nao_encontrada', venda: null, comissao: null };
  }
  if (candidates.length > 1) {
    return { status: 'duplicada', divergencia: 'duplicidade', venda: null, comissao: null };
  }

  const venda = candidates[0];
  const comissao = getVendaComissao(venda, comissoes);
  const comissaoInterna = comissao?.valor_comissao_total || venda.valor_comissao_prevista || 0;

  if (!closeMoney(venda.valor_carta, row.valor_carta)) {
    return { status: 'divergente', divergencia: 'valor_carta', venda, comissao };
  }
  if (row.comissao && !closeMoney(comissaoInterna, row.comissao)) {
    return { status: 'divergente', divergencia: 'valor_comissao', venda, comissao };
  }
  if (row.produto && normalize(venda.produto) !== normalize(row.produto)) {
    return { status: 'divergente', divergencia: 'produto', venda, comissao };
  }

  return { status: 'conciliada', divergencia: 'nenhuma', venda, comissao };
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

export default function ConciliacaoAdministradora() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const teamMembers = useTeamMembers(user);
  const queryClient = useQueryClient();

  const [file, setFile] = useState(null);
  const [administradora, setAdministradora] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterAdministradora, setFilterAdministradora] = useState('todos');
  const [filterCompetencia, setFilterCompetencia] = useState('todos');

  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: importacoes = [] } = useQuery({
    queryKey: ['importacoesRelatorioAdministradora', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.ImportacaoRelatorioAdministradora.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const { data: allConciliacoes = [], isLoading } = useQuery({
    queryKey: ['conciliacoesVenda', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.ConciliacaoVenda.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendasConsorcio', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.VendasConsorcio.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.Comissoes.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', empresa],
    queryFn: async () => filterEmpresa(await base44.entities.Account.list('-created_date')),
    enabled: Boolean(empresa),
  });

  const conciliacoes = useMemo(
    () => applyAccessFilter(allConciliacoes, user, { liderField: 'lider', vendedorField: 'vendedor', teamMembers }),
    [allConciliacoes, user, teamMembers]
  );

  const importacaoPorId = useMemo(() => new Map(importacoes.map((item) => [item.id, item])), [importacoes]);
  const administradoras = useMemo(() => [...new Set(conciliacoes.map((item) => item.administradora).filter(Boolean))].sort(), [conciliacoes]);
  const competencias = useMemo(() => [...new Set(importacoes.map((item) => item.competencia).filter(Boolean))].sort(), [importacoes]);

  const filtered = useMemo(() => {
    const term = normalize(searchTerm);
    return conciliacoes.filter((item) => {
      const importacao = importacaoPorId.get(item.importacao_vinculada);
      if (filterStatus !== 'todos' && item.status_conciliacao !== filterStatus) return false;
      if (filterAdministradora !== 'todos' && item.administradora !== filterAdministradora) return false;
      if (filterCompetencia !== 'todos' && importacao?.competencia !== filterCompetencia) return false;
      if (!term) return true;
      return [item.cliente_relatorio, item.cliente_interno, item.grupo, item.cota]
        .some((value) => normalize(value).includes(term));
    });
  }, [conciliacoes, filterAdministradora, filterCompetencia, filterStatus, importacaoPorId, searchTerm]);

  const kpis = useMemo(() => ({
    totalImportacoes: importacoes.length,
    conciliadas: conciliacoes.filter((item) => item.status_conciliacao === 'conciliada').length,
    divergentes: conciliacoes.filter((item) => item.status_conciliacao === 'divergente').length,
    naoEncontradas: conciliacoes.filter((item) => item.status_conciliacao === 'nao_encontrada').length,
    valorConciliado: conciliacoes
      .filter((item) => item.status_conciliacao === 'conciliada')
      .reduce((sum, item) => sum + (item.valor_carta_interno || item.valor_carta_relatorio || 0), 0),
  }), [conciliacoes, importacoes.length]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !administradora) throw new Error('Informe arquivo e administradora.');
      const content = await readFile(file);
      const rows = parseCsv(content).map(mapReportRow);
      if (rows.length === 0) throw new Error('O arquivo não possui linhas válidas.');

      const importacao = await base44.entities.ImportacaoRelatorioAdministradora.create({
        empresa_vinculada: empresa,
        administradora,
        arquivo_nome: file.name,
        data_importacao: new Date().toISOString().slice(0, 10),
        competencia,
        total_linhas: rows.length,
        total_conciliado: 0,
        total_divergente: 0,
        total_nao_encontrado: 0,
        status_importacao: 'importada',
      });

      const created = [];
      for (const row of rows) {
        const result = classifyRow(row, administradora, vendas, comissoes);
        const venda = result.venda;
        const comissao = result.comissao;
        const comissaoInterna = comissao?.valor_comissao_total || venda?.valor_comissao_prevista || 0;
        const payload = {
          empresa_vinculada: empresa,
          importacao_vinculada: importacao.id,
          venda_vinculada: venda?.id || '',
          comissao_vinculada: comissao?.id || '',
          administradora,
          cliente_relatorio: row.cliente,
          cliente_interno: venda?.cliente || '',
          grupo: row.grupo || venda?.grupo || '',
          cota: row.cota || venda?.cota || '',
          cpf_cnpj: row.cpf_cnpj,
          produto_relatorio: row.produto,
          produto_interno: venda?.produto || '',
          vendedor: venda?.vendedor || '',
          lider: venda?.lider || '',
          valor_carta_relatorio: row.valor_carta,
          valor_carta_interno: venda?.valor_carta || 0,
          comissao_relatorio: row.comissao,
          comissao_interna: comissaoInterna,
          data_venda_relatorio: row.data_venda,
          data_prevista_pagamento: row.data_pagamento || comissao?.data_prevista_pagamento || venda?.data_prevista_pagamento || '',
          status_conciliacao: result.status,
          divergencia_tipo: result.divergencia,
          diferenca_valor_carta: Number(venda?.valor_carta || 0) - Number(row.valor_carta || 0),
          diferenca_comissao: Number(comissaoInterna || 0) - Number(row.comissao || 0),
        };
        created.push(await base44.entities.ConciliacaoVenda.create(payload));
      }

      await base44.entities.ImportacaoRelatorioAdministradora.update(importacao.id, {
        total_conciliado: created.filter((item) => item.status_conciliacao === 'conciliada').length,
        total_divergente: created.filter((item) => item.status_conciliacao === 'divergente').length,
        total_nao_encontrado: created.filter((item) => item.status_conciliacao === 'nao_encontrada').length,
        status_importacao: 'processada',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacoesRelatorioAdministradora', empresa] });
      queryClient.invalidateQueries({ queryKey: ['conciliacoesVenda', empresa] });
      setFile(null);
      setAdministradora('');
      setCompetencia('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (conciliacao) => {
      if (!conciliacao.venda_vinculada) return;
      await base44.entities.ConciliacaoVenda.update(conciliacao.id, {
        status_conciliacao: 'conciliada',
        divergencia_tipo: 'nenhuma',
      });
      await base44.entities.VendasConsorcio.update(conciliacao.venda_vinculada, {
        status_conciliacao: 'conciliada',
      });
      const comissao = conciliacao.comissao_vinculada
        ? comissoes.find((item) => item.id === conciliacao.comissao_vinculada)
        : comissoes.find((item) => item.venda_vinculada === conciliacao.venda_vinculada);
      if (comissao) {
        await base44.entities.Comissoes.update(comissao.id, {
          status_comissao: 'confirmada',
          data_confirmacao: new Date().toISOString().slice(0, 10),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliacoesVenda', empresa] });
      queryClient.invalidateQueries({ queryKey: ['vendasConsorcio', empresa] });
      queryClient.invalidateQueries({ queryKey: ['comissoes', empresa] });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: (conciliacao) => base44.entities.ConciliacaoVenda.update(conciliacao.id, { status_conciliacao: 'ignorada' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conciliacoesVenda', empresa] }),
  });

  const exportCSV = () => {
    const headers = ['Cliente Relatório', 'Cliente Interno', 'Administradora', 'Grupo', 'Cota', 'Valor Carta Relatório', 'Valor Carta Interno', 'Comissão Relatório', 'Comissão Interna', 'Status', 'Divergência', 'Venda Vinculada'];
    const rows = filtered.map((item) => [item.cliente_relatorio, item.cliente_interno, item.administradora, item.grupo, item.cota, item.valor_carta_relatorio, item.valor_carta_interno, item.comissao_relatorio, item.comissao_interna, item.status_conciliacao, item.divergencia_tipo, item.venda_vinculada]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'conciliacao_administradora.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Conciliação com Administradoras</h1>
          <p className="text-gray-500 mt-1">Importe relatórios das administradoras e concilie com vendas e comissões internas</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" />Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Importações</p><p className="text-2xl font-bold">{kpis.totalImportacoes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Conciliadas</p><p className="text-2xl font-bold text-green-700">{kpis.conciliadas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Divergentes</p><p className="text-2xl font-bold text-red-700">{kpis.divergentes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Não encontradas</p><p className="text-2xl font-bold text-gray-700">{kpis.naoEncontradas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Valor conciliado</p><p className="text-2xl font-bold text-primary">{money(kpis.valorConciliado)}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Arquivo CSV</Label>
            <Input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </div>
          <div>
            <Label>Administradora</Label>
            <Select value={administradora} onValueChange={setAdministradora}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.name}>{account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Competência</Label>
            <Input value={competencia} onChange={(event) => setCompetencia(event.target.value)} placeholder="2026-06" />
          </div>
          <Button onClick={() => importMutation.mutate()} disabled={!file || !administradora || importMutation.isPending}>
            <Upload className="w-4 h-4 mr-2" />{importMutation.isPending ? 'Importando...' : 'Importar relatório'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col xl:flex-row gap-3 xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar cliente, grupo ou cota..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full xl:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAdministradora} onValueChange={setFilterAdministradora}>
            <SelectTrigger className="w-full xl:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas administradoras</SelectItem>
              {administradoras.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCompetencia} onValueChange={setFilterCompetencia}>
            <SelectTrigger className="w-full xl:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas competências</SelectItem>
              {competencias.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente relatório</TableHead>
                <TableHead>Cliente interno</TableHead>
                <TableHead>Administradora</TableHead>
                <TableHead>Grupo/Cota</TableHead>
                <TableHead>Valor relatório</TableHead>
                <TableHead>Valor interno</TableHead>
                <TableHead>Comissão relatório</TableHead>
                <TableHead>Comissão interna</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Divergência</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8">Carregando conciliações...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-gray-500"><FileCheck className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhuma conciliação encontrada</TableCell></TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.cliente_relatorio || '-'}</TableCell>
                  <TableCell>{item.cliente_interno || '-'}</TableCell>
                  <TableCell>{item.administradora || '-'}</TableCell>
                  <TableCell>{item.grupo || '-'} / {item.cota || '-'}</TableCell>
                  <TableCell>{money(item.valor_carta_relatorio)}</TableCell>
                  <TableCell>{money(item.valor_carta_interno)}</TableCell>
                  <TableCell>{money(item.comissao_relatorio)}</TableCell>
                  <TableCell>{money(item.comissao_interna)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[item.status_conciliacao] || ''}>{STATUS_LABEL[item.status_conciliacao] || item.status_conciliacao}</Badge></TableCell>
                  <TableCell>{DIVERGENCIA_LABEL[item.divergencia_tipo] || item.divergencia_tipo || '-'}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{item.venda_vinculada || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!item.venda_vinculada} onClick={() => confirmMutation.mutate(item)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />Confirmar conciliação
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => ignoreMutation.mutate(item)}>Ignorar</DropdownMenuItem>
                        <DropdownMenuItem disabled>Vincular manualmente</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
