import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CpfCnpjInput, PhoneInput } from './MaskedInputs';
import { FieldError } from './FieldError';
import { validate, accountSchema } from '@/lib/validation';

const initialForm = {
  name: '',
  cnpj: '',
  contato: '',
  email: '',
  telefone: '',
  prazo_medio_pagamento: '',
  status: 'ativa',
};

export default function AccountDialog({ open, onOpenChange, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();
    const { ok, data, errors: errs } = validate(accountSchema, formData);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    onSubmit({
      ...data,
      prazo_medio_pagamento: formData.prazo_medio_pagamento ? Number(formData.prazo_medio_pagamento) : undefined,
    });
    setFormData(initialForm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Administradora</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Administradora *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <CpfCnpjInput id="cnpj" value={formData.cnpj} onChange={(value) => setFormData({ ...formData, cnpj: value })} placeholder="00.000.000/0000-00" />
              <FieldError message={errors.cnpj} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato">Contato Principal</Label>
              <Input id="contato" value={formData.contato} onChange={(e) => setFormData({ ...formData, contato: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <PhoneInput id="telefone" value={formData.telefone} onChange={(value) => setFormData({ ...formData, telefone: value })} placeholder="(11) 99999-9999" />
              <FieldError message={errors.telefone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo_medio_pagamento">Prazo Médio de Pagamento (dias)</Label>
              <Input id="prazo_medio_pagamento" inputMode="numeric" value={formData.prazo_medio_pagamento} onChange={(e) => setFormData({ ...formData, prazo_medio_pagamento: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Criando...' : 'Criar Administradora'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
