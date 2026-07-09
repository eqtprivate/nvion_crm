import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Target, TrendingUp, Users } from 'lucide-react';
import { formatCurrency, formatPhone } from '@/components/forms/MaskedInputs';

const STATUS_LABEL = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  em_analise: 'Em análise',
  suspensa: 'Suspensa',
};

export default function AccountInsightsDialog({ account, open, onOpenChange, contacts = [], opportunities = [] }) {
  if (!account) return null;

  const accountContacts = contacts.filter((contact) => contact.administradora === account.name || contact.company === account.name);
  const accountOpps = opportunities.filter((opportunity) => opportunity.administradora_pretendida === account.name);
  const wonValue = accountOpps
    .filter((opportunity) => opportunity.status === 'ganha')
    .reduce((sum, opportunity) => sum + (opportunity.valor_carta || 0), 0);
  const openOpps = accountOpps.filter((opportunity) => opportunity.status === 'aberta');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{account.name}</DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">{account.contato || account.email || 'Administradora'}</p>
            </div>
            <Badge className={account.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-200'}>
              {STATUS_LABEL[account.status] || account.status || '-'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{formatCurrency(wonValue)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Valor Ganho</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{openOpps.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Oportunidades Abertas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{accountContacts.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Contatos</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dados">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
            <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">CNPJ:</span> <span className="font-medium">{account.cnpj || '-'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Contato:</span> <span className="font-medium">{account.contato || '-'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="font-medium">{account.email || '-'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Telefone:</span> <span className="font-medium">{formatPhone(account.telefone) || '-'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Prazo médio:</span> <span className="font-medium">{account.prazo_medio_pagamento ? `${account.prazo_medio_pagamento} dias` : '-'}</span></div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-3 mt-4">
            {accountContacts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum contato encontrado</p>
            ) : (
              accountContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{contact.position || 'Contato'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{contact.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhone(contact.phone)}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-3 mt-4">
            {accountOpps.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma oportunidade vinculada</p>
            ) : (
              accountOpps.map((opportunity) => (
                <div key={opportunity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{opportunity.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Calendar className="inline w-3 h-3 mr-1" />
                      {opportunity.previsao_fechamento ? new Date(opportunity.previsao_fechamento).toLocaleDateString('pt-BR') : 'Sem previsão'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(opportunity.valor_carta)}</p>
                    <Badge className="mt-1 text-xs">{opportunity.status || '-'}</Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
