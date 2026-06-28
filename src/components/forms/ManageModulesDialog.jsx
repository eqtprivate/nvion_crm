import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AVAILABLE_MODULES,
  MODULE_LABELS,
  ROLE_MODULE_DEFAULTS,
  ROLE_LABELS,
} from '@/lib/modules';

export default function ManageModulesDialog({ open, onOpenChange, user, onSubmit, isLoading }) {
  const [selectedModules, setSelectedModules] = useState([]);

  useEffect(() => {
    if (user) {
      setSelectedModules(user.modulos_permitidos || []);
    }
  }, [user, open]);

  const toggleModule = (module, checked) => {
    if (checked) {
      setSelectedModules((prev) => [...prev, module]);
    } else {
      setSelectedModules((prev) => prev.filter((m) => m !== module));
    }
  };

  const applyRoleDefaults = () => {
    if (user?.role) {
      setSelectedModules(ROLE_MODULE_DEFAULTS[user.role] || []);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ modulos_permitidos: selectedModules });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Módulos — {user?.display_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            {user?.role && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">
                  Padrão do perfil: <strong>{ROLE_LABELS[user.role]}</strong>
                </span>
                <Button type="button" variant="outline" size="sm" onClick={applyRoleDefaults}>
                  Aplicar Padrões
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {AVAILABLE_MODULES.map((module) => (
                <div key={module} className="flex items-center space-x-3">
                  <Checkbox
                    id={`module-${module}`}
                    checked={selectedModules.includes(module)}
                    onCheckedChange={(checked) => toggleModule(module, checked)}
                  />
                  <Label htmlFor={`module-${module}`} className="cursor-pointer">
                    {MODULE_LABELS[module] || module}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Módulos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}