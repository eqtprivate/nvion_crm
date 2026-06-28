import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const emptyForm = {
  name: '', cliente_vinculado: '', lead_vinculado: '',
  vendedor: '', lider: '', administradora_pretendida: '',
  produto: '', valor_carta: '', previsao_fechamento: '',
  probabilidade: '', motivo_perda: '', status: 'aberta', stage: 'novo_contato',
};

export default function OpportunityDialog({ open, onOpenChange, onSubmit, isLoading, opportunity }) {
  const [form, setForm] = useState(emptyForm);
  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  useEffect(() => {
    if (opportunity) {
      setForm({
        name: opportunity.name || '',
        cliente_vinculado: opportunity.cliente_vinculado || '',
        lead_vinculado: opportunity.lead_vinculado || '',
        vendedor: opportunity.vendedor || '',
        lider: opportunity.lider || '',
        administradora_pretendida: opportunity.administradora_pretendida || '',
        produto: opportunity.produto || '',
        valor_carta: opportunity.valor_carta || '',
        previsao_fechamento: opportunity.previsao_fechamento || '',
        probabilidade: opportunity.probabilidade || '',
        motivo_perda: opportunity.motivo_perda || '',
        status: opportunity.status || 'aberta',
        stage: opportunity.stage || 'novo_contato',
      });
    } else {
      setForm(emptyForm);
    }
  }, [opportunity, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      valor_carta: form.valor_carta ? parseFloat(form.valor_carta) : undefined,
      probabilidade: form.probabilidade ? parseFloat(form.probabilidade) : undefined,
    });
    if (!opportunity) setForm(emptyForm);
  };

  const isEdit = !!opportunity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome da Oportunidade *</Label>
            <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: João Silva — Imóvel 350k" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Cliente Vinculado</Label>
              <Input value={form.cliente_vinculado} onChange={e => set('cliente_vinculado', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Lead de Origem</Label>
              <Input value={form.lead_vinculado} onChange={e => set('lead_vinculado', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Vendedor</Label>
              <Input value={form.vendedor} onChange={e => set('vendedor', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Líder Comercial</Label>
              <Input value={form.lider} onChange={e => set('lider', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Administradora Pretendida</Label>
              <Input value={form.administradora_pretendida} onChange={e => set('administradora_pretendida', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Produto</Label>
              <Input value={form.produto} onChange={e => set('produto', e.target.value)} placeholder="Imóvel, Veículo, Serviço..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Valor da Carta (R$) *</Label>
              <Input required type="number" value={form.valor_carta} onChange={e => set('valor_carta', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Probabilidade (%)</Label>
              <Input type="number" min="0" max="100" value={form.probabilidade} onChange={e => set('probabilidade', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Etapa</Label>
              <Select value={form.stage} onValueChange={v => set('stage', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPP_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPP_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Previsão de Fechamento</Label>
            <Input type="date" value={form.previsao_fechamento} onChange={e => set('previsao_fechamento', e.target.value)} />
          </div>
          {(form.status === 'perdida' || form.stage === 'perdida') && (
            <div className="space-y-1">
              <Label>Motivo da Perda</Label>
              <Textarea value={form.motivo_perda} onChange={e => set('motivo_perda', e.target.value)} rows={2} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Oportunidade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
