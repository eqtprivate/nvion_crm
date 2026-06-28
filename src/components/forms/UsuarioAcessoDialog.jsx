import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';
import { ROLE_LABELS, ROLE_MODULE_DEFAULTS } from '@/lib/modules';

const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function UsuarioAcessoDialog({ open, onOpenChange, onSubmit, isLoading, user }) {
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    role: 'vendedor',
    empresa_vinculada: '',
    status: 'pendente',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email || '',
        role: user.role || 'vendedor',
        empresa_vinculada: user.empresa_vinculada || '',
        status: user.status || 'pendente',
      });
    } else {
      setFormData({
        display_name: '',
        email: '',
        role: 'vendedor',
        empresa_vinculada: '',
        status: 'pendente',
      });
    }
  }, [user, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      modulos_permitidos: user?.modulos_permitidos?.length
        ? user.modulos_permitidos
        : ROLE_MODULE_DEFAULTS[formData.role] || [],
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição *</Label>
              <Input
                id="display_name"
                required
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Perfil</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa Vinculada</Label>
              <Input
                id="empresa"
                value={formData.empresa_vinculada}
                onChange={(e) => setFormData({ ...formData, empresa_vinculada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!user && (
            <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 mb-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                O usuário ficará com status <strong>Pendente</strong> até o primeiro acesso.
                Informe o email cadastrado e oriente-o a usar <strong>"Esqueci minha senha"</strong> na tela de login para definir sua senha.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : user ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}