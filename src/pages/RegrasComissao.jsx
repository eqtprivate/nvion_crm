import React, { useMemo, useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Percent, MoreVertical, Trash2, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PercentInput, MoneyInput, formatPercent, formatCurrency } from '@/components/forms/MaskedInputs';
import { FieldError } from '@/components/forms/FieldError';
import { validate, regraComissaoSchema } from '@/lib/validation';
import {
  TIPOS_REGRA,
  BASES_CALCULO,
  FORMAS_PAGAMENTO,
  GATILHOS_PAGAMENTO,
  STATUS_REGRA,
  TEMPLATES_REGRA,
  calcularComissao,
  somaPercentuais,
  round2,
} from '@/lib/comissao';

const PREVIEW_BASE_PADRAO = 1000000;

const tipoRegraLabel = Object.fromEntries(TIPOS_REGRA.map((t) => [t.value, t.label]));
const statusLabel = { ativa: 'Ativa', inativa: 'Inativa', suspensa: 'Suspensa', arquivada: 'Arquivada' };

const emptyForm = {
  nome_regra: '', administradora: '', produto: '', tabela_comercial: '', categoria_produto: '',
  tipo_regra_comissao: 'percentual_fixo', base_calculo: 'valor_carta',
  percentual_total: '', valor_fixo_total: '', quantidade_parcelas_comissionaveis: 1,
  forma_pagamento: 'a_vista',
  comissao_min: '', comissao_max: '',
  possui_estorno: false, sem_estorno: false, percentual_estorno: '', parcela_referencia_estorno: '',
  prazo_primeiro_pagamento_dias: 30, gatilho_pagamento: 'venda_criada',
  percentual_vendedor: '', percentual_lider: '', percentual_empresa: '',
  permitir_diferenca_manual: false, justificativa_diferenca: '',
  status: 'ativa', observacoes: '',
  parcelas: [],
};

// Converte uma regra (registro) + suas parcelas em estado de formulário
function regraToForm(regra, parcelas) {
  if (!regra) return { ...emptyForm };
  return {
    ...emptyForm,
    ...regra,
    percentual_total: regra.percentual_total ?? regra.percentual_base ?? '',
    quantidade_parcelas_comissionaveis: regra.quantidade_parcelas_comissionaveis || 1,
    prazo_primeiro_pagamento_dias: regra.prazo_primeiro_pagamento_dias || regra.prazo_pagamento_dias || 30,
    tipo_regra_comissao: regra.tipo_regra_comissao || 'percentual_fixo',
    base_calculo: regra.base_calculo || 'valor_carta',
    forma_pagamento: regra.forma_pagamento || 'a_vista',
    gatilho_pagamento: regra.gatilho_pagamento || 'venda_criada',
    status: regra.status || 'ativa',
    parcelas: (parcelas || [])
      .slice()
      .sort((a, b) => (a.numero_parcela || 0) - (b.numero_parcela || 0))
      .map((p) => ({
        numero_parcela: p.numero_parcela,
        percentual_parcela: p.percentual_parcela ?? '',
        dias_apos_venda: p.dias_apos_venda ?? '',
        gatilho_parcela: p.gatilho_parcela || regra.gatilho_pagamento || 'venda_criada',
        estornavel: !!p.estornavel,
      })),
  };
}

function RegraDialog({ open, onOpenChange, regra, parcelasRegra, produtos, administradoras, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [previewBase, setPreviewBase] = useState(String(PREVIEW_BASE_PADRAO));

  React.useEffect(() => {
    setForm(regra ? regraToForm(regra, parcelasRegra) : { ...emptyForm });
    setErrors({});
    setPreviewBase(String(PREVIEW_BASE_PADRAO));
  }, [regra, parcelasRegra, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tipo = form.tipo_regra_comissao;
  const isCustom = tipo === 'percentual_parcelado_customizado';
  const isIgual = tipo === 'percentual_parcelado_igual';
  const isFixoValor = tipo === 'valor_fixo';
  const isHibrido = tipo === 'hibrido';
  const isFaixa = tipo === 'faixa_variavel';

  const applyTemplate = (templateId) => {
    const tpl = TEMPLATES_REGRA.find((t) => t.id === templateId);
    if (!tpl) return;
    const patch = tpl.apply();
    setForm((f) => ({ ...f, ...patch, parcelas: patch.parcelas || [] }));
  };

  // ── parcelas customizadas ──
  const addParcela = () => setForm((f) => ({
    ...f,
    parcelas: [...f.parcelas, { numero_parcela: f.parcelas.length + 1, percentual_parcela: '', dias_apos_venda: '', gatilho_parcela: f.gatilho_pagamento, estornavel: false }],
  }));
  const removeParcela = (idx) => setForm((f) => ({
    ...f,
    parcelas: f.parcelas.filter((_, i) => i !== idx).map((p, i) => ({ ...p, numero_parcela: i + 1 })),
  }));
  const setParcela = (idx, k, v) => setForm((f) => ({
    ...f,
    parcelas: f.parcelas.map((p, i) => (i === idx ? { ...p, [k]: v } : p)),
  }));

  const somaParcelas = useMemo(() => somaPercentuais(form.parcelas), [form.parcelas]);
  const totalPct = Number(form.percentual_total || 0);
  const somaConfere = !isCustom || Math.abs(somaParcelas - totalPct) < 0.01;

  // ── preview ──
  const preview = useMemo(() => {
    try {
      return calcularComissao(form, { valor_carta: Number(previewBase || 0) }, form.parcelas);
    } catch {
      return null;
    }
  }, [form, previewBase]);

  const validar = () => {
    const { ok, errors: errs } = validate(regraComissaoSchema, form);
    const e = ok ? {} : { ...errs };

    if (isCustom) {
      if (form.parcelas.length === 0) e.parcelas = 'Adicione ao menos uma parcela';
      if (!somaConfere && !form.permitir_diferenca_manual) {
        e.percentual_total = `Soma das parcelas (${formatPercent(somaParcelas)}) difere do total (${formatPercent(totalPct)})`;
      }
      if (!somaConfere && form.permitir_diferenca_manual && !String(form.justificativa_diferenca || '').trim()) {
        e.justificativa_diferenca = 'Justifique a diferença manual';
      }
    }
    if (isFaixa) {
      if (Number(form.comissao_min || 0) <= 0) e.comissao_min = 'Informe a comissão mínima';
    }
    if (form.possui_estorno && form.sem_estorno) {
      e.sem_estorno = 'Marque apenas uma opção de estorno';
    }
    if (form.possui_estorno && Number(form.percentual_estorno || 0) <= 0) {
      e.percentual_estorno = 'Informe o percentual de estorno';
    }
    if (form.sem_estorno && Number(form.percentual_estorno || 0) > 0) {
      e.percentual_estorno = 'Sem estorno não permite percentual';
    }
    return e;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const e = validar();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{regra ? 'Editar Regra de Comissão' : 'Nova Regra de Comissão'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Templates rápidos */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Template rápido</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TEMPLATES_REGRA.map((t) => (
                <Button key={t.id} type="button" size="sm" variant="outline" className="bg-white" onClick={() => applyTemplate(t.id)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Cabeçalho */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cabeçalho da regra</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><Label>Nome da regra *</Label><Input value={form.nome_regra} onChange={(e) => set('nome_regra', e.target.value)} /><FieldError message={errors.nome_regra} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_REGRA.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Produto</Label>
                <Select value={form.produto || ''} onValueChange={(v) => set('produto', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{produtos.map((item) => <SelectItem key={item.id} value={item.nome_produto}>{item.nome_produto}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Administradora</Label>
                <Select value={form.administradora || ''} onValueChange={(v) => set('administradora', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{administradoras.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tabela comercial</Label><Input value={form.tabela_comercial || ''} onChange={(e) => set('tabela_comercial', e.target.value)} placeholder="Ex: B+ Select" /></div>
              <div><Label>Categoria</Label><Input value={form.categoria_produto || ''} onChange={(e) => set('categoria_produto', e.target.value)} /></div>
            </div>
          </div>

          {/* Modelo + base */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Modelo de comissão</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Modelo</Label>
                <Select value={form.tipo_regra_comissao} onValueChange={(v) => set('tipo_regra_comissao', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_REGRA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Base de cálculo</Label>
                <Select value={form.base_calculo} onValueChange={(v) => set('base_calculo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BASES_CALCULO.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Gatilho de pagamento</Label>
                <Select value={form.gatilho_pagamento} onValueChange={(v) => set('gatilho_pagamento', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GATILHOS_PAGAMENTO.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Campos condicionais */}
              {(tipo === 'percentual_fixo') && (
                <>
                  <div><Label>Percentual total</Label><PercentInput value={form.percentual_total} onChange={(v) => set('percentual_total', v)} /><FieldError message={errors.percentual_total} /></div>
                  <div><Label>Prazo de pagamento (dias)</Label><Input type="number" value={form.prazo_primeiro_pagamento_dias} onChange={(e) => set('prazo_primeiro_pagamento_dias', e.target.value)} /></div>
                </>
              )}

              {isIgual && (
                <>
                  <div><Label>Percentual total</Label><PercentInput value={form.percentual_total} onChange={(v) => set('percentual_total', v)} /><FieldError message={errors.percentual_total} /></div>
                  <div><Label>Qtd. parcelas</Label><Input type="number" min="1" value={form.quantidade_parcelas_comissionaveis} onChange={(e) => set('quantidade_parcelas_comissionaveis', e.target.value)} /></div>
                  <div><Label>Prazo 1ª parcela (dias)</Label><Input type="number" value={form.prazo_primeiro_pagamento_dias} onChange={(e) => set('prazo_primeiro_pagamento_dias', e.target.value)} /></div>
                </>
              )}

              {isFixoValor && (
                <>
                  <div><Label>Valor fixo total</Label><MoneyInput value={form.valor_fixo_total} onChange={(v) => set('valor_fixo_total', v)} /></div>
                  <div><Label>Forma de pagamento</Label>
                    <Select value={form.forma_pagamento} onValueChange={(v) => set('forma_pagamento', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FORMAS_PAGAMENTO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {form.forma_pagamento !== 'a_vista' && (
                    <div><Label>Qtd. parcelas</Label><Input type="number" min="1" value={form.quantidade_parcelas_comissionaveis} onChange={(e) => set('quantidade_parcelas_comissionaveis', e.target.value)} /></div>
                  )}
                </>
              )}

              {isHibrido && (
                <>
                  <div><Label>Percentual total</Label><PercentInput value={form.percentual_total} onChange={(v) => set('percentual_total', v)} /></div>
                  <div><Label>Valor fixo adicional</Label><MoneyInput value={form.valor_fixo_total} onChange={(v) => set('valor_fixo_total', v)} /></div>
                  <div><Label>Forma de pagamento</Label>
                    <Select value={form.forma_pagamento} onValueChange={(v) => set('forma_pagamento', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FORMAS_PAGAMENTO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {isFaixa && (
                <>
                  <div><Label>Comissão mínima</Label><PercentInput value={form.comissao_min} onChange={(v) => set('comissao_min', v)} /><FieldError message={errors.comissao_min} /></div>
                  <div><Label>Comissão máxima</Label><PercentInput value={form.comissao_max} onChange={(v) => set('comissao_max', v)} /></div>
                </>
              )}

              {isCustom && (
                <div><Label>Percentual total (alvo)</Label><PercentInput value={form.percentual_total} onChange={(v) => set('percentual_total', v)} /><FieldError message={errors.percentual_total} /></div>
              )}
            </div>
          </div>

          {/* Tabela editável de parcelas (customizado) */}
          {isCustom && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Parcelas comissionáveis</p>
                <Button type="button" size="sm" variant="outline" onClick={addParcela}><Plus className="w-4 h-4 mr-1" />Parcela</Button>
              </div>
              <FieldError message={errors.parcelas} />
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Nº</TableHead>
                      <TableHead>% da parcela</TableHead>
                      <TableHead>Dias após venda</TableHead>
                      <TableHead>Gatilho</TableHead>
                      <TableHead className="w-20">Estornável</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.parcelas.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-4">Nenhuma parcela. Clique em "Parcela".</TableCell></TableRow>
                    ) : form.parcelas.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell><PercentInput value={p.percentual_parcela} onChange={(v) => setParcela(idx, 'percentual_parcela', v)} /></TableCell>
                        <TableCell><Input type="number" value={p.dias_apos_venda} onChange={(e) => setParcela(idx, 'dias_apos_venda', e.target.value)} placeholder="auto" /></TableCell>
                        <TableCell>
                          <Select value={p.gatilho_parcela} onValueChange={(v) => setParcela(idx, 'gatilho_parcela', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{GATILHOS_PAGAMENTO.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center"><Checkbox checked={!!p.estornavel} onCheckedChange={(c) => setParcela(idx, 'estornavel', !!c)} /></TableCell>
                        <TableCell><Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeParcela(idx)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className={`flex items-center gap-2 mt-2 text-sm ${somaConfere ? 'text-green-700' : 'text-orange-600'}`}>
                {!somaConfere && <AlertTriangle className="w-4 h-4" />}
                Soma das parcelas: <strong>{formatPercent(somaParcelas)}</strong> / total alvo: <strong>{formatPercent(totalPct)}</strong>
              </div>
              {!somaConfere && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.permitir_diferenca_manual} onCheckedChange={(v) => set('permitir_diferenca_manual', v)} id="dif-manual" />
                    <Label htmlFor="dif-manual">Permitir diferença manual</Label>
                  </div>
                  {form.permitir_diferenca_manual && (
                    <div><Label>Justificativa</Label><Input value={form.justificativa_diferenca} onChange={(e) => set('justificativa_diferenca', e.target.value)} /><FieldError message={errors.justificativa_diferenca} /></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview de parcelas iguais / valor fixo */}
          {(isIgual || isFixoValor || isHibrido) && preview && (
            <div className="text-sm text-gray-600">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prévia do cronograma</p>
              <div className="flex flex-wrap gap-2">
                {preview.parcelas.map((p) => (
                  <Badge key={p.numero_parcela} variant="outline">
                    {p.numero_parcela}ª: {p.percentual_parcela ? formatPercent(p.percentual_parcela) : formatCurrency(p.valor_parcela_total)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Distribuição comercial */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Distribuição comercial (percentuais independentes sobre a base da operação)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>% Vendedor</Label><PercentInput value={form.percentual_vendedor} onChange={(v) => set('percentual_vendedor', v)} /></div>
              <div><Label>% Líder</Label><PercentInput value={form.percentual_lider} onChange={(v) => set('percentual_lider', v)} /></div>
              <div><Label>% Empresa</Label><PercentInput value={form.percentual_empresa} onChange={(v) => set('percentual_empresa', v)} /></div>
            </div>
          </div>

          {/* Estorno */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Política de estorno</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex items-center gap-2"><Switch id="possui-estorno" checked={form.possui_estorno} onCheckedChange={(v) => set('possui_estorno', v)} /><Label htmlFor="possui-estorno">Possui estorno</Label></div>
              <div className="flex items-center gap-2"><Switch id="sem-estorno" checked={form.sem_estorno} onCheckedChange={(v) => set('sem_estorno', v)} /><Label htmlFor="sem-estorno">Sem estorno</Label></div>
              <div><Label>% Estorno</Label><PercentInput value={form.percentual_estorno} onChange={(v) => set('percentual_estorno', v)} disabled={form.sem_estorno} /><FieldError message={errors.percentual_estorno} /></div>
              <div><Label>Parcela ref. estorno</Label><Input type="number" value={form.parcela_referencia_estorno} onChange={(e) => set('parcela_referencia_estorno', e.target.value)} disabled={form.sem_estorno} /></div>
            </div>
            <FieldError message={errors.sem_estorno} />
          </div>

          {/* Preview financeiro */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-gray-700">Simulação financeira</p>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-500">Carta exemplo</Label>
                <div className="w-44"><MoneyInput value={previewBase} onChange={setPreviewBase} /></div>
              </div>
            </div>
            {preview && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Comissão total</span><strong>{formatCurrency(preview.valorComissaoTotal)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">Vendedor</span><span>{formatCurrency(preview.totalVendedor)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Líder</span><span>{formatCurrency(preview.totalLider)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Empresa</span><span>{formatCurrency(preview.totalEmpresa)}</span></div>
                {form.possui_estorno && !form.sem_estorno && (
                  <div className="flex justify-between text-orange-600"><span>Estorno aplicável ({formatPercent(form.percentual_estorno)})</span><span>{formatCurrency(Number(previewBase || 0) * Number(form.percentual_estorno || 0) / 100)}</span></div>
                )}
                <div className="pt-2 mt-2 border-t">
                  {preview.parcelas.map((p) => (
                    <div key={p.numero_parcela} className="flex justify-between text-gray-600">
                      <span>Parcela {p.numero_parcela}{p.percentual_parcela ? ` (${formatPercent(p.percentual_parcela)})` : ''}</span>
                      <span>{formatCurrency(p.valor_parcela_total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div><Label>Observações</Label><Input value={form.observacoes || ''} onChange={(e) => set('observacoes', e.target.value)} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Regra'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RegrasComissao() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRegra, setSelectedRegra] = useState(null);
  const filterEmpresa = (items) => items.filter((item) => item.empresa_vinculada === empresa);

  const { data: regras = [], isLoading } = useQuery({ queryKey: ['regrasComissao', empresa], queryFn: async () => filterEmpresa(await db.RegrasComissao.list('-created_date')), enabled: Boolean(empresa) });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtosConsorcio', empresa], queryFn: async () => filterEmpresa(await db.ProdutoConsorcio.list('-created_date')), enabled: Boolean(empresa) });
  const { data: administradoras = [] } = useQuery({ queryKey: ['accounts', empresa], queryFn: async () => filterEmpresa(await db.Account.list('-created_date')), enabled: Boolean(empresa) });

  // parcelas da regra selecionada (para edição)
  const { data: parcelasRegra = [] } = useQuery({
    queryKey: ['parcelasRegra', selectedRegra?.id],
    queryFn: async () => {
      const all = await db.ParcelasRegraComissao.list();
      return all.filter((p) => p.regra_comissao_vinculada === selectedRegra.id);
    },
    enabled: Boolean(selectedRegra?.id && dialogOpen),
  });

  // Monta o payload do cabeçalho, sincronizando campos legados.
  const buildPayload = (form) => {
    const tipo = form.tipo_regra_comissao;
    let percentualEfetivo = Number(form.percentual_total || 0);
    if (tipo === 'percentual_parcelado_customizado') percentualEfetivo = somaPercentuais(form.parcelas);
    if (tipo === 'faixa_variavel') percentualEfetivo = Number(form.comissao_min || form.percentual_total || 0);
    if (tipo === 'valor_fixo') percentualEfetivo = 0;
    const tipoComissaoLegado = tipo === 'valor_fixo' ? 'fixo' : tipo === 'hibrido' ? 'hibrido' : 'percentual';
    return {
      empresa_vinculada: empresa,
      nome_regra: form.nome_regra,
      administradora: form.administradora || '',
      produto: form.produto || '',
      tabela_comercial: form.tabela_comercial || '',
      categoria_produto: form.categoria_produto || '',
      tipo_regra_comissao: tipo,
      base_calculo: form.base_calculo,
      percentual_total: round2(percentualEfetivo),
      percentual_base: round2(percentualEfetivo), // compat. com consumidores legados
      tipo_comissao: tipoComissaoLegado,
      valor_fixo_total: Number(form.valor_fixo_total || 0),
      quantidade_parcelas_comissionaveis: Number(form.quantidade_parcelas_comissionaveis || 1),
      forma_pagamento: form.forma_pagamento,
      comissao_min: Number(form.comissao_min || 0),
      comissao_max: Number(form.comissao_max || 0),
      possui_estorno: !!form.possui_estorno,
      sem_estorno: !!form.sem_estorno,
      percentual_estorno: Number(form.percentual_estorno || 0),
      parcela_referencia_estorno: Number(form.parcela_referencia_estorno || 0),
      prazo_primeiro_pagamento_dias: Number(form.prazo_primeiro_pagamento_dias || 30),
      prazo_pagamento_dias: Number(form.prazo_primeiro_pagamento_dias || 30), // compat.
      gatilho_pagamento: form.gatilho_pagamento,
      percentual_vendedor: Number(form.percentual_vendedor || 0),
      percentual_lider: Number(form.percentual_lider || 0),
      percentual_empresa: Number(form.percentual_empresa || 0),
      permitir_diferenca_manual: !!form.permitir_diferenca_manual,
      justificativa_diferenca: form.justificativa_diferenca || '',
      status: form.status,
      observacoes: form.observacoes || '',
    };
  };

  // Sincroniza os registros de ParcelasRegraComissao (apenas para customizado).
  const syncParcelas = async (regraId, form) => {
    const all = await db.ParcelasRegraComissao.list();
    const existentes = all.filter((p) => p.regra_comissao_vinculada === regraId);
    await Promise.all(existentes.map((p) => db.ParcelasRegraComissao.delete(p.id)));
    if (form.tipo_regra_comissao === 'percentual_parcelado_customizado') {
      await Promise.all(form.parcelas.map((p, idx) =>
        db.ParcelasRegraComissao.create({
          empresa_vinculada: empresa,
          regra_comissao_vinculada: regraId,
          numero_parcela: idx + 1,
          percentual_parcela: round2(p.percentual_parcela),
          dias_apos_venda: p.dias_apos_venda !== '' && p.dias_apos_venda != null ? Number(p.dias_apos_venda) : undefined,
          gatilho_parcela: p.gatilho_parcela || form.gatilho_pagamento,
          estornavel: !!p.estornavel,
        })
      ));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const payload = buildPayload(form);
      const saved = selectedRegra?.id
        ? await db.RegrasComissao.update(selectedRegra.id, payload)
        : await db.RegrasComissao.create(payload);
      const regraId = selectedRegra?.id || saved?.id;
      if (regraId) await syncParcelas(regraId, form);
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regrasComissao', empresa] });
      queryClient.invalidateQueries({ queryKey: ['parcelasRegra'] });
      setDialogOpen(false);
      setSelectedRegra(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const all = await db.ParcelasRegraComissao.list();
      await Promise.all(all.filter((p) => p.regra_comissao_vinculada === id).map((p) => db.ParcelasRegraComissao.delete(p.id)));
      return db.RegrasComissao.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regrasComissao', empresa] }),
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return regras.filter((item) =>
      item.nome_regra?.toLowerCase().includes(term) ||
      item.produto?.toLowerCase().includes(term) ||
      item.administradora?.toLowerCase().includes(term) ||
      item.tabela_comercial?.toLowerCase().includes(term)
    );
  }, [regras, searchTerm]);

  const kpis = useMemo(() => ({
    total: regras.length,
    ativas: regras.filter((item) => item.status === 'ativa').length,
    comissaoMedia: regras.length ? round2(regras.reduce((sum, item) => sum + (Number(item.percentual_total || item.percentual_base) || 0), 0) / regras.length) : 0,
    produtos: new Set(regras.map((item) => item.produto).filter(Boolean)).size,
  }), [regras]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Regras de Comissão</h1><p className="text-gray-500 mt-1">Políticas de comissão por produto, administradora e tabela comercial</p></div>
        <Button onClick={() => { setSelectedRegra(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nova Regra</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total de Regras</p><p className="text-2xl font-bold">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Regras Ativas</p><p className="text-2xl font-bold text-green-700">{kpis.ativas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Comissão Média</p><p className="text-2xl font-bold text-primary">{formatPercent(kpis.comissaoMedia)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Produtos com Regra</p><p className="text-2xl font-bold text-blue-700">{kpis.produtos}</p></CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar regras..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Regra</TableHead><TableHead>Produto</TableHead><TableHead>Tabela</TableHead><TableHead>Modelo</TableHead><TableHead>Total</TableHead><TableHead>Parcelas</TableHead><TableHead>Estorno</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando regras...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-500"><Percent className="w-12 h-12 mx-auto mb-2 text-gray-300" />Nenhuma regra encontrada</TableCell></TableRow>
                : filtered.map((regra) => (
                  <TableRow key={regra.id}>
                    <TableCell className="font-medium">{regra.nome_regra}</TableCell>
                    <TableCell>{regra.produto || '-'}</TableCell>
                    <TableCell>{regra.tabela_comercial || '-'}</TableCell>
                    <TableCell><span className="text-xs">{tipoRegraLabel[regra.tipo_regra_comissao] || 'Percentual fixo'}</span></TableCell>
                    <TableCell>{regra.tipo_regra_comissao === 'valor_fixo' ? formatCurrency(regra.valor_fixo_total) : formatPercent(regra.percentual_total || regra.percentual_base)}</TableCell>
                    <TableCell>{regra.quantidade_parcelas_comissionaveis || 1}x</TableCell>
                    <TableCell>{regra.sem_estorno ? <Badge variant="outline" className="text-xs">Sem estorno</Badge> : regra.possui_estorno ? <Badge className="bg-orange-100 text-orange-700 text-xs">{formatPercent(regra.percentual_estorno)}</Badge> : '-'}</TableCell>
                    <TableCell><Badge>{statusLabel[regra.status] || regra.status || '-'}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedRegra(regra); setDialogOpen(true); }}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(regra.id)}>Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <RegraDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelectedRegra(null); }}
        regra={selectedRegra}
        parcelasRegra={parcelasRegra}
        produtos={produtos}
        administradoras={administradoras}
        onSubmit={(form) => saveMutation.mutate(form)}
        loading={saveMutation.isPending}
      />
    </div>
  );
}
