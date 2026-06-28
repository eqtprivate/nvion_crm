import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ORIGENS, TEMPERATURAS, LEAD_STATUSES } from './LeadDialog';

export default function EditLeadDialog({ open, onOpenChange, lead, onSubmit, isLoading }) {
  const [form, setForm] = useState({});
  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name || '', email: lead.email || '', phone: lead.phone || '',
        origem: lead.origem || 'base_propria', campanha: lead.campanha || '',
        produto_interesse: lead.produto_interesse || '', valor_estimado_carta: lead.valor_estimado_carta || '',
        administradora_interesse: lead.administradora_interesse || '', vendedor_responsavel: lead.vendedor_responsavel || '',
        lider_vinculado: lead.lider_vinculado || '', temperatura: lead.temperatura || 'morno',
        status: lead.status || 'novo_contato', data_ultimo_contato: lead.data_ultimo_contato || '',
        proxima_acao: lead.proxima_acao || '', observacoes: lead.observacoes || '',
      });
    }
  }, [lead, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, valor_estimado_carta: form.valor_estimado_carta ? parseFloat(form.valor_estimado_carta) : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Nome *</Label><Input required value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Origem</Label><Select value={form.origem || 'base_propria'} onValueChange={v => set('origem', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORIGENS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Campanha</Label><Input value={form.campanha || ''} onChange={e => set('campanha', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Produto de Interesse</Label><Input value={form.produto_interesse || ''} onChange={e => set('produto_interesse', e.target.value)} /></div>
            <div className="space-y-1"><Label>Valor Estimado da Carta (R$)</Label><Input type="number" value={form.valor_estimado_carta || ''} onChange={e => set('valor_estimado_carta', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Administradora de Interesse</Label><Input value={form.administradora_interesse || ''} onChange={e => set('administradora_interesse', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Vendedor Responsável</Label><Input value={form.vendedor_responsavel || ''} onChange={e => set('vendedor_responsavel', e.target.value)} /></div>
            <div className="space-y-1"><Label>Líder Vinculado</Label><Input value={form.lider_vinculado || ''} onChange={e => set('lider_vinculado', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Temperatura</Label><Select value={form.temperatura || 'morno'} onValueChange={v => set('temperatura', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEMPERATURAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Status</Label><Select value={form.status || 'novo_contato'} onValueChange={v => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Data do Último Contato</Label><Input type="date" value={form.data_ultimo_contato || ''} onChange={e => set('data_ultimo_contato', e.target.value)} /></div>
            <div className="space-y-1"><Label>Próxima Ação</Label><Input value={form.proxima_acao || ''} onChange={e => set('proxima_acao', e.target.value)} /></div>
          </div>
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