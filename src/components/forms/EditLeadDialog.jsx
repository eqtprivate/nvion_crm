import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ORIGENS, TEMPERATURAS, LEAD_STATUSES, TIPOS_PROXIMA_ACAO } from './LeadDialog';
import { MoneyInput, PhoneInput } from './MaskedInputs';
import { FieldError } from './FieldError';
import { validate, leadSchema } from '@/lib/validation';

export default function EditLeadDialog({
  open,
  onOpenChange,
  lead,
  onSubmit,
  isLoading,
  produtos = [],
  administradoras = [],
  vendedores = [],
  equipes = [],
}) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const lideres = useMemo(() => {
    const nomes = new Set([
      ...vendedores.filter(v => v.tipo_vendedor === 'lider').map(v => v.nome).filter(Boolean),
      ...equipes.map(e => e.lider_responsavel).filter(Boolean),
    ]);
    return Array.from(nomes).sort();
  }, [vendedores, equipes]);

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name || '', email: lead.email || '', phone: lead.phone || '',
        origem: lead.origem || 'base_propria', campanha: lead.campanha || '',
        produto_interesse: lead.produto_interesse || '', valor_estimado_carta: lead.valor_estimado_carta || '',
        administradora_interesse: lead.administradora_interesse || '', vendedor_responsavel: lead.vendedor_responsavel || '',
        lider_vinculado: lead.lider_vinculado || '', temperatura: lead.temperatura || 'morno',
        status: lead.status || 'novo_contato', data_ultimo_contato: lead.data_ultimo_contato || '',
        tipo_proxima_acao: lead.tipo_proxima_acao || '', data_proxima_acao: lead.data_proxima_acao || '',
        proxima_acao: lead.proxima_acao || '', observacoes: lead.observacoes || '',
      });
    }
  }, [lead, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { ok, data, errors: errs } = validate(leadSchema, form);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    onSubmit({ ...data, valor_estimado_carta: form.valor_estimado_carta ? parseFloat(form.valor_estimado_carta) : undefined });
  };

  const handleProdutoChange = (nomeProduto) => {
    const produto = produtos.find(item => item.nome_produto === nomeProduto);
    setForm(prev => ({
      ...prev,
      produto_interesse: nomeProduto,
      administradora_interesse: produto?.administradora_vinculada || prev.administradora_interesse,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Nome *</Label><Input value={form.name || ''} onChange={e => set('name', e.target.value)} /><FieldError message={errors.name} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /><FieldError message={errors.email} /></div>
            <div className="space-y-1"><Label>Telefone</Label><PhoneInput value={form.phone || ''} onChange={value => set('phone', value)} /><FieldError message={errors.phone} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Origem</Label><Select value={form.origem || 'base_propria'} onValueChange={v => set('origem', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORIGENS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Campanha</Label><Input value={form.campanha || ''} onChange={e => set('campanha', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Produto de Interesse</Label><Select value={form.produto_interesse || ''} onValueChange={handleProdutoChange}><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger><SelectContent>{produtos.filter(p => p.nome_produto).map(p => <SelectItem key={p.id} value={p.nome_produto}>{p.nome_produto}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Valor Estimado da Carta</Label><MoneyInput value={form.valor_estimado_carta || ''} onChange={value => set('valor_estimado_carta', value)} /></div>
          </div>
          <div className="space-y-1"><Label>Administradora de Interesse</Label><Select value={form.administradora_interesse || ''} onValueChange={v => set('administradora_interesse', v)}><SelectTrigger><SelectValue placeholder="Selecione a administradora" /></SelectTrigger><SelectContent>{administradoras.filter(a => a.name).map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Vendedor Responsável</Label><Select value={form.vendedor_responsavel || ''} onValueChange={v => set('vendedor_responsavel', v)}><SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger><SelectContent>{vendedores.filter(v => v.nome).map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Líder Vinculado</Label><Select value={form.lider_vinculado || ''} onValueChange={v => set('lider_vinculado', v)}><SelectTrigger><SelectValue placeholder="Selecione o líder" /></SelectTrigger><SelectContent>{lideres.map(nome => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Temperatura</Label><Select value={form.temperatura || 'morno'} onValueChange={v => set('temperatura', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEMPERATURAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Status</Label><Select value={form.status || 'novo_contato'} onValueChange={v => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label>Último Contato</Label><Input type="date" value={form.data_ultimo_contato || ''} onChange={e => set('data_ultimo_contato', e.target.value)} /></div>
            <div className="space-y-1"><Label>Tipo Próx. Ação</Label><Select value={form.tipo_proxima_acao || ''} onValueChange={v => set('tipo_proxima_acao', v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{TIPOS_PROXIMA_ACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Data Próx. Ação</Label><Input type="date" value={form.data_proxima_acao || ''} onChange={e => set('data_proxima_acao', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Próxima Ação</Label><Input value={form.proxima_acao || ''} onChange={e => set('proxima_acao', e.target.value)} placeholder="Ex.: Enviar simulação pelo WhatsApp" /></div>
          <div className="space-y-1"><Label>Observações</Label><Textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={3} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
