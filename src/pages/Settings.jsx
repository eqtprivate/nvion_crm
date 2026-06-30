import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Building2, Download, Save, Trash2 } from 'lucide-react';
import { PhoneInput, CpfCnpjInput } from '@/components/forms/MaskedInputs';
import { usePlanos } from '@/lib/usePlanos';

const UF_LIST = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

function MinhaEmpresaTab({ empresa_vinculada }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  const { data: planos = [] } = usePlanos();

  const { data: empresaRecord, isLoading } = useQuery({
    queryKey: ['minhaEmpresa', empresa_vinculada],
    queryFn: async () => {
      const all = await base44.entities.Empresa.list();
      return all.find((e) => e.razao_social === empresa_vinculada || e.nome_fantasia === empresa_vinculada) || null;
    },
    enabled: Boolean(empresa_vinculada),
  });

  const { data: usuariosEmpresa = [] } = useQuery({
    queryKey: ['usuariosMinhaEmpresa', empresa_vinculada],
    queryFn: async () => {
      const all = await base44.entities.UsuarioAcesso.list();
      return all.filter((u) => u.empresa_vinculada === empresa_vinculada);
    },
    enabled: Boolean(empresa_vinculada),
  });

  useEffect(() => {
    if (empresaRecord && !form) {
      setForm({ ...empresaRecord });
    }
  }, [empresaRecord]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empresa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minhaEmpresa', empresa_vinculada] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form?.id) return;
    updateMutation.mutate({ id: form.id, data: form });
  };

  if (isLoading) return <p className="text-gray-500 py-8 text-center">Carregando dados da empresa...</p>;
  if (!form) return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-6 flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-yellow-800 text-sm">Nenhum registro de empresa vinculado à sua conta. Contate o super administrador.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Identidade da Empresa</CardTitle>
          <CardDescription>Razão social, CNPJ e dados de contato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.logo_url && (
            <div className="mb-2">
              <img src={form.logo_url} alt="Logo" className="h-16 object-contain rounded border p-1" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Razão Social</Label><Input value={form.razao_social || ''} onChange={(e) => set('razao_social', e.target.value)} /></div>
            <div><Label>Nome Fantasia</Label><Input value={form.nome_fantasia || ''} onChange={(e) => set('nome_fantasia', e.target.value)} /></div>
            <div><Label>CNPJ</Label><CpfCnpjInput value={form.cnpj || ''} onChange={(v) => set('cnpj', v)} /></div>
            <div>
              <Label>Responsável principal</Label>
              {usuariosEmpresa.length > 0 ? (
                <Select value={form.responsavel_principal || ''} onValueChange={(v) => set('responsavel_principal', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                  <SelectContent>
                    {usuariosEmpresa.map((u) => (
                      <SelectItem key={u.id} value={u.display_name}>{u.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.responsavel_principal || ''} onChange={(e) => set('responsavel_principal', e.target.value)} />
              )}
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div><Label>Telefone</Label><PhoneInput value={form.telefone || ''} onChange={(v) => set('telefone', v)} /></div>
            <div><Label>Website</Label><Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></div>
            <div>
              <Label>Plano contratado</Label>
              <Input value={form.plano_contratado ? (planos.find((p) => p.slug === form.plano_contratado)?.label || form.plano_contratado) : 'Não definido'} readOnly className="bg-gray-50 cursor-default" />
            </div>
            <div className="md:col-span-2"><Label>URL do Logotipo</Label><Input value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>CEP</Label><Input value={form.cep || ''} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" /></div>
            <div className="md:col-span-2"><Label>Logradouro</Label><Input value={form.logradouro || ''} onChange={(e) => set('logradouro', e.target.value)} /></div>
            <div><Label>Número</Label><Input value={form.numero || ''} onChange={(e) => set('numero', e.target.value)} /></div>
            <div><Label>Complemento</Label><Input value={form.complemento || ''} onChange={(e) => set('complemento', e.target.value)} /></div>
            <div><Label>Bairro</Label><Input value={form.bairro || ''} onChange={(e) => set('bairro', e.target.value)} /></div>
            <div><Label>Cidade</Label><Input value={form.cidade || ''} onChange={(e) => set('cidade', e.target.value)} /></div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado || ''} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdminEmpresa = user?.role === 'admin_empresa';
  const isAdmin = isSuperAdmin || isAdminEmpresa;
  const [resetConfirmation, setResetConfirmation] = useState('');
  const queryClient = useQueryClient();

  const { data: defaultSettings } = useQuery({
    queryKey: ['defaultSettings', empresa],
    queryFn: async () => {
      const settings = await base44.entities.DefaultSettings.list();
      const filtered = settings.filter(s => s.empresa_vinculada === empresa);
      return filtered[0] || null;
    },
    enabled: Boolean(empresa),
  });

  const createSettingsMutation = useMutation({
    mutationFn: (data) => base44.entities.DefaultSettings.create({ ...data, empresa_vinculada: empresa }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defaultSettings', empresa] }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DefaultSettings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defaultSettings', empresa] }),
  });

  const handleUpdateSettings = async (field, value) => {
    if (defaultSettings?.id) {
      await updateSettingsMutation.mutateAsync({ id: defaultSettings.id, data: { [field]: value } });
    } else {
      await createSettingsMutation.mutateAsync({ [field]: value });
    }
  };

  const handleResetData = async () => {
    if (resetConfirmation !== 'RESET') {
      alert('Digite RESET para confirmar');
      return;
    }
    if (!confirm('Isso irá apagar permanentemente todos os clientes, administradoras, leads e oportunidades. Tem certeza?')) {
      return;
    }
    try {
      const filterEmpresa = (items) => items.filter(i => isSuperAdmin || i.empresa_vinculada === empresa);
      await Promise.all([
        base44.entities.Contact.list().then(items => Promise.all(filterEmpresa(items).map(i => base44.entities.Contact.delete(i.id)))),
        base44.entities.Account.list().then(items => Promise.all(filterEmpresa(items).map(i => base44.entities.Account.delete(i.id)))),
        base44.entities.Lead.list().then(items => Promise.all(filterEmpresa(items).map(i => base44.entities.Lead.delete(i.id)))),
        base44.entities.Opportunity.list().then(items => Promise.all(filterEmpresa(items).map(i => base44.entities.Opportunity.delete(i.id)))),
      ]);
      queryClient.invalidateQueries();
      setResetConfirmation('');
      alert('Dados resetados com sucesso');
    } catch {
      alert('Erro ao resetar dados');
    }
  };

  const exportData = async (entityName, fileName) => {
    const all = await base44.entities[entityName].list();
    const data = isSuperAdmin ? all : all.filter(i => i.empresa_vinculada === empresa);
    if (!data.length) return;
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = (type) => {
    const templates = {
      clientes: 'name,email,phone,cpf_cnpj,cidade,estado,origem,status\nJoão Silva,joao@exemplo.com,11999999999,000.000.000-00,São Paulo,SP,indicacao,lead',
      administradoras: 'name,cnpj,contato,email,telefone,prazo_medio_pagamento,status\nAdministradora XYZ,00.000.000/0001-00,Fulano,contato@adm.com,1134567890,30,ativa',
      leads: 'name,email,phone,origem,temperatura,status,valor_estimado_carta\nMaria Santos,maria@exemplo.com,11988887777,instagram,morno,novo_contato,80000',
    };
    const csv = templates[type];
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const showEmpresaTab = isAdminEmpresa;
  const tabCount = showEmpresaTab ? 3 : 2;

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 mt-1">Gerencie as preferências da plataforma</p>
        </div>

        <Tabs defaultValue={showEmpresaTab ? 'empresa' : 'defaults'} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-${tabCount}`}>
            {showEmpresaTab && <TabsTrigger value="empresa">Minha Empresa</TabsTrigger>}
            <TabsTrigger value="defaults">Padrões</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
          </TabsList>

          {showEmpresaTab && (
            <TabsContent value="empresa">
              <MinhaEmpresaTab empresa_vinculada={empresa} />
            </TabsContent>
          )}

          <TabsContent value="defaults" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Valores Padrão</CardTitle>
                <CardDescription>Defina os valores padrão para novos registros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Moeda Padrão</Label>
                  <Input
                    value={defaultSettings?.default_currency || 'BRL'}
                    onChange={(e) => handleUpdateSettings('default_currency', e.target.value)}
                    placeholder="BRL"
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dias para Follow-up Padrão</Label>
                  <Input
                    type="number"
                    value={defaultSettings?.default_follow_up_days || 3}
                    onChange={(e) => handleUpdateSettings('default_follow_up_days', parseInt(e.target.value))}
                    className="max-w-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Templates de Importação</CardTitle>
                <CardDescription>Baixe modelos CSV para importação em massa</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => downloadTemplate('clientes')}>
                  <Download className="w-4 h-4 mr-2" />Template Clientes
                </Button>
                <Button variant="outline" onClick={() => downloadTemplate('administradoras')}>
                  <Download className="w-4 h-4 mr-2" />Template Administradoras
                </Button>
                <Button variant="outline" onClick={() => downloadTemplate('leads')}>
                  <Download className="w-4 h-4 mr-2" />Template Leads
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exportar Dados</CardTitle>
                <CardDescription>Exporte os dados do CRM em CSV</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => exportData('Contact', 'clientes')}>
                  <Download className="w-4 h-4 mr-2" />Exportar Clientes
                </Button>
                <Button variant="outline" onClick={() => exportData('Account', 'administradoras')}>
                  <Download className="w-4 h-4 mr-2" />Exportar Administradoras
                </Button>
                <Button variant="outline" onClick={() => exportData('Lead', 'leads')}>
                  <Download className="w-4 h-4 mr-2" />Exportar Leads
                </Button>
                <Button variant="outline" onClick={() => exportData('Opportunity', 'oportunidades')}>
                  <Download className="w-4 h-4 mr-2" />Exportar Oportunidades
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription className="text-red-600">
                  Apaga permanentemente todos os dados do CRM. Essa ação não pode ser desfeita.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Digite "RESET" para confirmar</Label>
                  <Input
                    value={resetConfirmation}
                    onChange={(e) => setResetConfirmation(e.target.value)}
                    placeholder="RESET"
                    className="max-w-xs"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleResetData}
                  disabled={resetConfirmation !== 'RESET'}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Resetar Todos os Dados
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
