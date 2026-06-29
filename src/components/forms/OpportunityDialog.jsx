import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoneyInput, PercentInput } from './MaskedInputs';

export const OPP_STAGES = [
  { value: 'novo_contato', label: 'Novo Contato' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'simulacao', label: 'Simulação' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'em_aprovacao', label: 'Em Aprovação' },
  { value: 'venda_concluida', label: 'Venda Concluída' },
  { value: 'perdida', label: 'Perdida' },
];

export const OPP_STATUSES = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'ganha', label: 'Ganha' },
  { value: 'perdida', label: 'Perdida' },
  { value: 'suspensa', label: 'Suspensa' },
];

const emptyForm = { name: '', cliente_vinculado: '', lead_vinculado: '', vendedor: '', lider: '', administradora_pretendida: '', produto: '', valor_carta: '', previsao_fechamento: '', probabilidade: '', motivo_perda: '', status: 'aberta', stage: 'novo_contato' };

export default function OpportunityDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  opportunity,
  currentUser,
  leads = [],
  contacts = [],
  produtos = [],
  administradoras = [],
  vendedores = [],
  equipes = [],
}) {
  const [form, setForm] = useState(emptyForm);
  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const lideres = useMemo(() => {
    const nomes = new Set([
      ...vendedores.filter(v => v.tipo_vendedor === 'lider').map(v => v.nome).filter(Boolean),
      ...equipes.map(e => e.lider_responsavel).filter(Boolean),
    ]);
    return Array.from(nomes).sort();
  }, [vendedores, equipes]);

  useEffect(() => {
    if (opportunity) {
      setForm({ name: opportunity.name || '', cliente_vinculado: opportunity.cliente_vinculado || '', lead_vinculado: opportunity.lead_vinculado || '', vendedor: opportunity.vendedor || '', lider: opportunity.lider || '', administradora_pretendida: opportunity.administradora_pretendida || '', produto: opportunity.produto || '', valor_carta: opportunity.valor_carta || '', previsao_fechamento: opportunity.previsao_fechamento || '', probabilidade: opportunity.probabilidade || '', motivo_perda: opportunity.motivo_perda || '', status: opportunity.status || 'aberta', stage: opportunity.stage || 'novo_contato' });
    } else {
      const base = { ...emptyForm };
      if (currentUser?.role === 'vendedor') base.vendedor = currentUser.display_name || '';
      if (currentUser?.role === 'lider_comercial') base.lider = currentUser.display_name || '';
      setForm(base);
    }
  }, [opportunity, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, valor_carta: form.valor_carta ? parseFloat(form.valor_carta) : undefined, probabilidade: form.probabilidade ? parseFloat(form.probabilidade) : undefined });
    if (!opportunity) setForm(emptyForm);
  };

  const handleLeadChange = (leadId) => {
    const lead = leads.find(item => item.id === leadId);
    if (!lead) return set('lead_vinculado', leadId);
    setForm(prev => ({
      ...prev,
      name: prev.name || `Oportunidade - ${lead.name}`,
      cliente_vinculado: prev.cliente_vinculado || lead.name || '',
      lead_vinculado: lead.id,
      vendedor: prev.vendedor || lead.vendedor_responsavel || '',
      lider: prev.lider || lead.lider_vinculado || '',
      administradora_pretendida: prev.administradora_pretendida || lead.administradora_interesse || '',
      produto: prev.produto || lead.produto_interesse || '',
      valor_carta: prev.valor_carta || lead.valor_estimado_carta || '',
      probabilidade: prev.probabilidade || (lead.temperatura === 'quente' ? 70 : lead.temperatura === 'frio' ? 30 : 50),
      stage: prev.stage === 'novo_contato' && lead.status && !['novo_contato', 'venda_concluida', 'perdida'].includes(lead.status) ? lead.status : prev.stage,
    }));
  };

  const handleProdutoChange = (nomeProduto) => {
    const produto = produtos.find(item => item.nome_produto === nomeProduto);
    setForm(prev => ({
      ...prev,
      produto: nomeProduto,
      administradora_pretendida: produto?.administradora_vinculada || prev.administradora_pretendida,
    }));
  };

  const isEdit = !!opportunity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1"><Label>Nome da Oportunidade *</Label><Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: João Silva — Imóvel 350k" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Cliente Vinculado</Label><Select value={form.cliente_vinculado || ''} onValueChange={v => set('cliente_vinculado', v)}><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger><SelectContent>{contacts.filter(c => c.name).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Lead de Origem</Label><Select value={form.lead_vinculado || ''} onValueChange={handleLeadChange}><SelectTrigger><SelectValue placeholder="Selecione o lead" /></SelectTrigger><SelectContent>{leads.filter(l => l.id && l.name).map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Vendedor</Label><Select value={form.vendedor || ''} onValueChange={v => set('vendedor', v)}><SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger><SelectContent>{vendedores.filter(v => v.nome).map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Líder Comercial</Label><Select value={form.lider || ''} onValueChange={v => set('lider', v)}><SelectTrigger><SelectValue placeholder="Selecione o líder" /></SelectTrigger><SelectContent>{lideres.map(nome => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Administradora Pretendida</Label><Select value={form.administradora_pretendida || ''} onValueChange={v => set('administradora_pretendida', v)}><SelectTrigger><SelectValue placeholder="Selecione a administradora" /></SelectTrigger><SelectContent>{administradoras.filter(a => a.name).map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Produto</Label><Select value={form.produto || ''} onValueChange={handleProdutoChange}><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger><SelectContent>{produtos.filter(p => p.nome_produto).map(p => <SelectItem key={p.id} value={p.nome_produto}>{p.nome_produto}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Valor da Carta *</Label><MoneyInput required value={form.valor_carta} onChange={value => set('valor_carta', value)} /></div>
            <div className="space-y-1"><Label>Probabilidade</Label><PercentInput value={form.probabilidade} onChange={value => set('probabilidade', value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Etapa</Label><Select value={form.stage} onValueChange={v => set('stage', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPP_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Status</Label><Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPP_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1"><Label>Previsão de Fechamento</Label><Input type="date" value={form.previsao_fechamento} onChange={e => set('previsao_fechamento', e.target.value)} /></div>
          {(form.status === 'perdida' || form.stage === 'perdida') && (
            <div className="space-y-1"><Label>Motivo da Perda</Label><Textarea value={form.motivo_perda} onChange={e => set('motivo_perda', e.target.value)} rows={2} /></div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Oportunidade'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
