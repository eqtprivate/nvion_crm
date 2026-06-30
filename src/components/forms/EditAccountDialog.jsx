import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function EditAccountDialog({ open, onOpenChange, account, onSubmit, isLoading, readOnly = false }) {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        cnpj: account.cnpj || '',
        contato: account.contato || '',
        email: account.email || '',
        telefone: account.telefone || '',
        prazo_medio_pagamento: account.prazo_medio_pagamento || '',
        status: account.status || 'ativa',
      });
    }
  }, [account]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (readOnly) return;

    const { ok, data, errors: errs } = validate(accountSchema, formData);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    onSubmit({
      ...data,
      prazo_medio_pagamento: formData.prazo_medio_pagamento ? Number(formData.prazo_medio_pagamento) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? 'Detalhes da Administradora' : 'Editar Administradora'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome da Administradora *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={readOnly} />
              <FieldError message={errors.name} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <CpfCnpjInput value={formData.cnpj} onChange={(value) => setFormData({ ...formData, cnpj: value })} disabled={readOnly} />
              <FieldError message={errors.cnpj} />
            </div>
            <div>
              <Label>Contato Principal</Label>
              <Input value={formData.contato} onChange={(e) => setFormData({ ...formData, contato: e.target.value })} disabled={readOnly} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={readOnly} />
              <FieldError message={errors.email} />
            </div>
            <div>
              <Label>Telefone</Label>
              <PhoneInput value={formData.telefone} onChange={(value) => setFormData({ ...formData, telefone: value })} disabled={readOnly} />
              <FieldError message={errors.telefone} />
            </div>
            <div>
              <Label>Prazo Médio de Pagamento (dias)</Label>
              <Input inputMode="numeric" value={formData.prazo_medio_pagamento} onChange={(e) => setFormData({ ...formData, prazo_medio_pagamento: e.target.value.replace(/\D/g, '') })} disabled={readOnly} />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
