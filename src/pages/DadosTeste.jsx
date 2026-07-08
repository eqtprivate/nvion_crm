import React, { useState } from 'react';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

async function createIfMissing(entity, findField, payload) {
  const list = await db[entity].list('-created_date');
  const exists = list.find((item) => item[findField] === payload[findField] && item.empresa_vinculada === payload.empresa_vinculada);
  if (exists) return { created: false, item: exists };
  const item = await db[entity].create(payload);
  return { created: true, item };
}

const ALLOWED_ROLES = ['super_admin', 'admin_empresa'];

export default function DadosTeste() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const canAccess = ALLOWED_ROLES.includes(user?.role);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);

  const addResult = (entity, created, total) => {
    setResults((prev) => [...prev, { entity, created, total }]);
  };

  const popular = async () => {
    setLoading(true);
    setDone(false);
    setResults([]);

    const administradoras = [
      { name: 'Porto Seguro Consórcios', cnpj: '61.198.164/0001-60', contato: 'Mariana Alves', email: 'parcerias@portoseguro.com.br', telefone: '(11) 3003-9303', prazo_medio_pagamento: 30, formato_relatorio: 'xlsx', status: 'ativa', empresa_vinculada: empresa },
      { name: 'Embracon', cnpj: '58.113.812/0001-23', contato: 'Carlos Menezes', email: 'comercial@embracon.com.br', telefone: '(11) 4003-9999', prazo_medio_pagamento: 45, formato_relatorio: 'xlsx', status: 'ativa', empresa_vinculada: empresa },
      { name: 'Rodobens Consórcios', cnpj: '51.990.695/0001-37', contato: 'Fernanda Lopes', email: 'parcerias@rodobens.com.br', telefone: '(17) 2136-9000', prazo_medio_pagamento: 35, formato_relatorio: 'csv', status: 'ativa', empresa_vinculada: empresa },
    ];

    let created = 0;
    for (const item of administradoras) created += (await createIfMissing('Account', 'name', item)).created ? 1 : 0;
    addResult('Administradoras', created, administradoras.length);

    const produtos = [
      { nome_produto: 'Consórcio Imóvel Porto Seguro', administradora_vinculada: 'Porto Seguro Consórcios', categoria: 'imovel', percentual_comissao_padrao: 3.2, prazo_medio_pagamento: 30, status: 'ativo', empresa_vinculada: empresa },
      { nome_produto: 'Consórcio Veículo Embracon', administradora_vinculada: 'Embracon', categoria: 'veiculo', percentual_comissao_padrao: 2.7, prazo_medio_pagamento: 45, status: 'ativo', empresa_vinculada: empresa },
      { nome_produto: 'Consórcio Pesados Rodobens', administradora_vinculada: 'Rodobens Consórcios', categoria: 'pesados', percentual_comissao_padrao: 2.9, prazo_medio_pagamento: 35, status: 'ativo', empresa_vinculada: empresa },
      { nome_produto: 'Consórcio Serviços Embracon', administradora_vinculada: 'Embracon', categoria: 'servicos', percentual_comissao_padrao: 2.4, prazo_medio_pagamento: 45, status: 'ativo', empresa_vinculada: empresa },
      { nome_produto: 'Consórcio Agro Rodobens', administradora_vinculada: 'Rodobens Consórcios', categoria: 'agro', percentual_comissao_padrao: 3.0, prazo_medio_pagamento: 35, status: 'ativo', empresa_vinculada: empresa },
    ];

    created = 0;
    for (const item of produtos) created += (await createIfMissing('ProdutoConsorcio', 'nome_produto', item)).created ? 1 : 0;
    addResult('Produtos de Consórcio', created, produtos.length);

    const equipes = [
      { nome_equipe: 'Equipe Sul', lider_responsavel: 'Fernanda Prado', vendedores_vinculados: ['Ana Lima', 'Bruno Ferreira'], meta_mensal: 1200000, status: 'ativo', empresa_vinculada: empresa },
      { nome_equipe: 'Equipe Sudeste', lider_responsavel: 'Gustavo Ribeiro', vendedores_vinculados: ['Carla Souza', 'Diego Martins'], meta_mensal: 1500000, status: 'ativo', empresa_vinculada: empresa },
      { nome_equipe: 'Equipe Alta Performance', lider_responsavel: 'Fernanda Prado', vendedores_vinculados: ['Ana Lima', 'Carla Souza'], meta_mensal: 2000000, status: 'ativo', empresa_vinculada: empresa },
    ];

    created = 0;
    for (const item of equipes) created += (await createIfMissing('EquipeComercial', 'nome_equipe', item)).created ? 1 : 0;
    addResult('Equipes Comerciais', created, equipes.length);

    const vendedores = [
      { nome: 'Ana Lima', email: 'ana.lima@demo.com.br', telefone: '(11) 99911-1001', cpf_cnpj: '111.111.111-11', equipe: 'Equipe Sul', lider: 'Fernanda Prado', tipo_vendedor: 'interno', meta_mensal: 500000, status: 'ativo', data_inicio: '2026-01-10', empresa_vinculada: empresa },
      { nome: 'Bruno Ferreira', email: 'bruno.ferreira@demo.com.br', telefone: '(11) 99922-1002', cpf_cnpj: '222.222.222-22', equipe: 'Equipe Sul', lider: 'Fernanda Prado', tipo_vendedor: 'parceiro', meta_mensal: 400000, status: 'ativo', data_inicio: '2026-02-01', empresa_vinculada: empresa },
      { nome: 'Carla Souza', email: 'carla.souza@demo.com.br', telefone: '(21) 99933-1003', cpf_cnpj: '333.333.333-33', equipe: 'Equipe Sudeste', lider: 'Gustavo Ribeiro', tipo_vendedor: 'interno', meta_mensal: 550000, status: 'ativo', data_inicio: '2026-01-20', empresa_vinculada: empresa },
      { nome: 'Diego Martins', email: 'diego.martins@demo.com.br', telefone: '(31) 99944-1004', cpf_cnpj: '444.444.444-44', equipe: 'Equipe Sudeste', lider: 'Gustavo Ribeiro', tipo_vendedor: 'corban', meta_mensal: 450000, status: 'ativo', data_inicio: '2026-03-05', empresa_vinculada: empresa },
      { nome: 'Fernanda Prado', email: 'fernanda.prado@demo.com.br', telefone: '(41) 99955-1005', cpf_cnpj: '555.555.555-55', equipe: 'Equipe Alta Performance', lider: 'Fernanda Prado', tipo_vendedor: 'lider', meta_mensal: 800000, status: 'ativo', data_inicio: '2025-12-01', empresa_vinculada: empresa },
      { nome: 'Gustavo Ribeiro', email: 'gustavo.ribeiro@demo.com.br', telefone: '(31) 99966-1006', cpf_cnpj: '666.666.666-66', equipe: 'Equipe Sudeste', lider: 'Gustavo Ribeiro', tipo_vendedor: 'lider', meta_mensal: 750000, status: 'ativo', data_inicio: '2025-12-15', empresa_vinculada: empresa },
    ];

    created = 0;
    for (const item of vendedores) created += (await createIfMissing('Vendedores', 'nome', item)).created ? 1 : 0;
    addResult('Vendedores', created, vendedores.length);

    const clientes = [
      { name: 'Ricardo Almeida', email: 'ricardo.almeida@cliente.com.br', phone: '(11) 98888-0001', cpf_cnpj: '123.456.789-01', cidade: 'São Paulo', estado: 'SP', origem: 'indicacao', vendedor_responsavel: 'Ana Lima', status: 'em_negociacao', empresa_vinculada: empresa },
      { name: 'Patrícia Gomes', email: 'patricia.gomes@cliente.com.br', phone: '(21) 98888-0002', cpf_cnpj: '234.567.890-12', cidade: 'Rio de Janeiro', estado: 'RJ', origem: 'instagram', vendedor_responsavel: 'Carla Souza', status: 'cliente_ativo', empresa_vinculada: empresa },
      { name: 'Marcos Vieira', email: 'marcos.vieira@cliente.com.br', phone: '(31) 98888-0003', cpf_cnpj: '345.678.901-23', cidade: 'Belo Horizonte', estado: 'MG', origem: 'google', vendedor_responsavel: 'Diego Martins', status: 'venda_concluida', empresa_vinculada: empresa },
      { name: 'Juliana Torres', email: 'juliana.torres@cliente.com.br', phone: '(41) 98888-0004', cpf_cnpj: '456.789.012-34', cidade: 'Curitiba', estado: 'PR', origem: 'whatsapp', vendedor_responsavel: 'Bruno Ferreira', status: 'cliente_ativo', empresa_vinculada: empresa },
    ];

    created = 0;
    for (const item of clientes) created += (await createIfMissing('Contact', 'email', item)).created ? 1 : 0;
    addResult('Clientes', created, clientes.length);

    const leads = clientes.map((cliente, index) => ({ name: cliente.name, email: cliente.email, phone: cliente.phone, origem: cliente.origem, produto_interesse: produtos[index % produtos.length].nome_produto, valor_estimado_carta: [350000, 90000, 520000, 180000][index], administradora_interesse: produtos[index % produtos.length].administradora_vinculada, vendedor_responsavel: cliente.vendedor_responsavel, lider_vinculado: index % 2 === 0 ? 'Fernanda Prado' : 'Gustavo Ribeiro', temperatura: index % 2 === 0 ? 'quente' : 'morno', status: index < 3 ? 'simulacao' : 'proposta_enviada', empresa_vinculada: empresa }));

    created = 0;
    for (const item of leads) created += (await createIfMissing('Lead', 'email', item)).created ? 1 : 0;
    addResult('Leads', created, leads.length);

    const oportunidades = leads.map((lead, index) => ({ name: `Oportunidade - ${lead.name}`, cliente_vinculado: lead.name, lead_vinculado: lead.name, vendedor: lead.vendedor_responsavel, lider: lead.lider_vinculado, administradora_pretendida: lead.administradora_interesse, produto: lead.produto_interesse, valor_carta: lead.valor_estimado_carta, previsao_fechamento: '2026-07-15', probabilidade: [80, 65, 90, 70][index], status: index < 3 ? 'aberta' : 'ganha', stage: index < 3 ? 'proposta_enviada' : 'venda_concluida', empresa_vinculada: empresa }));

    created = 0;
    for (const item of oportunidades) created += (await createIfMissing('Opportunity', 'name', item)).created ? 1 : 0;
    addResult('Oportunidades', created, oportunidades.length);

    const vendas = oportunidades.slice(0, 4).map((op, index) => {
      const produto = produtos.find((p) => p.nome_produto === op.produto) || produtos[0];
      const valorComissao = op.valor_carta * produto.percentual_comissao_padrao / 100;
      return { cliente: op.cliente_vinculado, oportunidade_vinculada: op.name, vendedor: op.vendedor, lider: op.lider, equipe: index % 2 === 0 ? 'Equipe Sul' : 'Equipe Sudeste', administradora: op.administradora_pretendida, produto: op.produto, grupo: `G${1000 + index}`, cota: `C${200 + index}`, valor_carta: op.valor_carta, data_venda: '2026-06-20', percentual_comissao_prevista: produto.percentual_comissao_padrao, valor_comissao_prevista: valorComissao, data_prevista_pagamento: '2026-07-20', status_operacional: index < 2 ? 'lancada' : 'concluida', status_conciliacao: index < 2 ? 'nao_conciliada' : 'conciliada', status_financeiro: 'comissao_prevista', empresa_vinculada: empresa };
    });

    created = 0;
    for (const item of vendas) created += (await createIfMissing('VendasConsorcio', 'grupo', item)).created ? 1 : 0;
    addResult('Vendas de Consórcio', created, vendas.length);

    const regras = produtos.map((p) => ({ nome_regra: `Regra - ${p.nome_produto}`, administradora: p.administradora_vinculada, produto: p.nome_produto, tipo_comissao: 'percentual', percentual_base: p.percentual_comissao_padrao, percentual_vendedor: 60, percentual_lider: 10, prazo_pagamento_dias: p.prazo_medio_pagamento, status: 'ativa', empresa_vinculada: empresa }));

    created = 0;
    for (const item of regras) created += (await createIfMissing('RegrasComissao', 'nome_regra', item)).created ? 1 : 0;
    addResult('Regras de Comissão', created, regras.length);

    setDone(true);
    setLoading(false);
  };

  if (!canAccess) {
    return (
      <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 font-medium">Acesso restrito</p>
          <p className="text-sm text-gray-400">Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-yellow-400 mx-auto" />
          <p className="text-gray-700 font-medium">Empresa não vinculada</p>
          <p className="text-sm text-gray-500">Seu usuário não possui <code>empresa_vinculada</code> definida. Vincule uma empresa antes de popular dados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Dados de Teste</h1>
          <p className="text-gray-500 mt-1">Carga controlada de dados fictícios para demonstração do NVION CRM.</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" />Popular Dados de Demonstração</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Esta ação cria registros reais vinculados à empresa <strong>{empresa}</strong>. A carga evita duplicidade por nome ou e-mail e não apaga dados existentes.</p>
            <Button onClick={popular} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              {loading ? 'Populando dados...' : 'Popular Dados de Demonstração'}
            </Button>
          </CardContent>
        </Card>
        {results.length > 0 && <Card><CardContent className="p-4 space-y-2">{results.map((r) => <div key={r.entity} className="flex items-center justify-between border-b last:border-b-0 py-2"><span>{r.entity}</span><Badge>{r.created} criados / {r.total} previstos</Badge></div>)}</CardContent></Card>}
        {done && <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4"><CheckCircle2 className="w-5 h-5" />Dados de demonstração carregados com sucesso.</div>}
      </div>
    </div>
  );
}
