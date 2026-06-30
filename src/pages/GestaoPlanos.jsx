import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AVAILABLE_MODULES, MODULE_LABELS } from '@/lib/modules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Users, Package } from 'lucide-react';
import { FieldError } from '@/components/forms/FieldError';
import { validate, planoSchema } from '@/lib/validation';

const EMPTY_FORM = {
  slug: '',
  label: '',
  max_usuarios: '',
  modulos: [],
  ativo: true,
  descricao: '',
};

function PlanoDialog({ open, onOpenChange, plano, onSuccess }) {
  const isEdit = !!plano?.id;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setErrors({});
    if (open) {
      if (plano) {
        setForm({
          slug: plano.slug || '',
          label: plano.label || '',
          max_usuarios: plano.max_usuarios === 0 ? '' : String(plano.max_usuarios || ''),
          modulos: plano.modulos || [],
          ativo: plano.ativo !== false,
          descricao: plano.descricao || '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, plano]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.Plano.update(plano.id, data)
        : base44.entities.Plano.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({ title: isEdit ? 'Plano atualizado.' : 'Plano criado.' });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => toast({ title: 'Erro ao salvar plano.', variant: 'destructive' }),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleModule = (mod, checked) => {
    setForm((f) => ({
      ...f,
      modulos: checked ? [...f.modulos, mod] : f.modulos.filter((m) => m !== mod),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { ok, errors: errs } = validate(planoSchema, form);
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    const maxU = form.max_usuarios === '' ? 0 : Number(form.max_usuarios);
    mutation.mutate({ ...form, max_usuarios: maxU });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="ex: essencial"
                disabled={isEdit}
              />
              {isEdit && <p className="text-xs text-gray-400">O slug não pode ser alterado.</p>}
              <FieldError message={errors.slug} />
            </div>
            <div className="space-y-1">
              <Label>Nome do Plano *</Label>
              <Input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="ex: Essencial" />
              <FieldError message={errors.label} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Máx. Usuários</Label>
            <Input
              type="number"
              min="0"
              value={form.max_usuarios}
              onChange={(e) => set('max_usuarios', e.target.value)}
              placeholder="0 = ilimitado"
            />
            <p className="text-xs text-gray-400">Deixe 0 ou em branco para ilimitado.</p>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ativo} onCheckedChange={(v) => set('ativo', v)} id="plano-ativo" />
            <Label htmlFor="plano-ativo">Plano ativo</Label>
          </div>
          <div className="space-y-2">
            <Label>Módulos incluídos</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_MODULES.map((mod) => (
                <div key={mod} className="flex items-center gap-2">
                  <Checkbox
                    id={`mod-${mod}`}
                    checked={form.modulos.includes(mod)}
                    onCheckedChange={(checked) => toggleModule(mod, checked)}
                  />
                  <Label htmlFor={`mod-${mod}`} className="cursor-pointer font-normal">
                    {MODULE_LABELS[mod] || mod}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">{form.modulos.length} módulo(s) selecionado(s)</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function GestaoPlanos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ['planos'],
    queryFn: () => base44.entities.Plano.list('-created_date'),
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Plano.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({ title: 'Plano removido.' });
      setDeleteId(null);
    },
    onError: () => toast({ title: 'Erro ao remover plano.', variant: 'destructive' }),
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Acesso restrito a Super Admin.
      </div>
    );
  }

  const empresasPorPlano = (slug) =>
    empresas.filter((e) => e.plano_contratado === slug).length;

  const openCreate = () => {
    setEditingPlano(null);
    setDialogOpen(true);
  };

  const openEdit = (plano) => {
    setEditingPlano(plano);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Planos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os planos disponíveis e seus módulos</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border p-4 space-y-2 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-gray-900">{p.label}</span>
              {p.ativo ? (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">Ativo</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Inativo</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="w-3.5 h-3.5" />
              {p.max_usuarios === 0 ? 'Ilimitado' : `Até ${p.max_usuarios} usuários`}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Package className="w-3.5 h-3.5" />
              {(p.modulos || []).length} módulos
            </div>
            <div className="text-xs text-gray-400">
              {empresasPorPlano(p.slug)} empresa(s) neste plano
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Plano</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Máx. Usuários</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : planos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhum plano cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              planos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.slug}</code></TableCell>
                  <TableCell>{p.max_usuarios === 0 ? '∞ ilimitado' : p.max_usuarios}</TableCell>
                  <TableCell>{(p.modulos || []).length}</TableCell>
                  <TableCell>{empresasPorPlano(p.slug)}</TableCell>
                  <TableCell>
                    {p.ativo ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteId(p.id)}
                        disabled={empresasPorPlano(p.slug) > 0}
                        title={empresasPorPlano(p.slug) > 0 ? 'Plano em uso por empresas' : 'Excluir'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlanoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plano={editingPlano}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Tem certeza que deseja excluir este plano? Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
