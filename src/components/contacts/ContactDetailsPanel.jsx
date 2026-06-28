import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Phone, Mail, MessageCircle, Building2, MapPin, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const statusLabels = {
  lead: 'Lead',
  em_negociacao: 'Em Negociação',
  cliente_ativo: 'Cliente Ativo',
  venda_concluida: 'Venda Concluída',
  perdido: 'Perdido',
  inativo: 'Inativo',
};

const statusColors = {
  lead: 'bg-blue-100 text-blue-800',
  em_negociacao: 'bg-yellow-100 text-yellow-800',
  cliente_ativo: 'bg-green-100 text-green-800',
  venda_concluida: 'bg-purple-100 text-purple-800',
  perdido: 'bg-red-100 text-red-800',
  inativo: 'bg-gray-100 text-gray-800',
};

export default function ContactDetailsPanel({ contact, onClose }) {
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', contact?.id],
    queryFn: () => base44.entities.Opportunity.list(),
    enabled: !!contact,
    select: (data) => data.filter(o => o.cliente_vinculado === contact?.id),
  });

  if (!contact) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto border-l">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold">Detalhes do Cliente</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile */}
        <div className="text-center pb-6 border-b">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">
              {contact.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-1">{contact.name}</h3>
          {contact.cpf_cnpj && (
            <p className="text-gray-500 text-sm mb-2">{contact.cpf_cnpj}</p>
          )}
          <Badge className={statusColors[contact.status] || 'bg-gray-100 text-gray-800'}>
            {statusLabels[contact.status] || contact.status}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="w-full">
            <Phone className="w-4 h-4 mr-1" />
            Ligar
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{contact.email}</p>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{contact.phone}</p>
                </div>
              </div>
            )}
            {contact.empresa_vinculada && (
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Empresa</p>
                  <p className="font-medium">{contact.empresa_vinculada}</p>
                </div>
              </div>
            )}
            {(contact.cidade || contact.estado) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Localização</p>
                  <p className="font-medium">{[contact.cidade, contact.estado].filter(Boolean).join(' — ')}</p>
                </div>
              </div>
            )}
            {contact.origem && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Origem</p>
                  <p className="font-medium">{contact.origem}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="oportunidades" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
            <TabsTrigger value="observacoes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="oportunidades" className="mt-4 space-y-3">
            {opportunities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma oportunidade vinculada</p>
            ) : (
              opportunities.map((opp) => (
                <Card key={opp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{opp.name}</p>
                        {opp.valor_carta && (
                          <p className="text-sm text-gray-600">R$ {opp.valor_carta.toLocaleString('pt-BR')}</p>
                        )}
                      </div>
                      <Badge>{opp.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="observacoes" className="mt-4">
            {contact.observacoes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.observacoes}</p>
            ) : (
              <p className="text-center text-gray-500 py-8">Sem observações registradas</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
