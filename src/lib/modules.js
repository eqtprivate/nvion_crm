export const AVAILABLE_MODULES = [
  'Dashboard',
  'Leads',
  'Marketing',
  'Oportunidades',
  'Contacts',
  'Accounts',
  'Vendedores',
  'VendasConsorcio',
  'Comissoes',
  'ProdutoConsorcio',
  'EquipeComercial',
  'Recebiveis',
  'RegrasComissao',
  'Reports',
  'Settings',
  'GestaoAcessos',
  'ConciliacaoAdministradora',
  'GestaoEmpresas',
  'GestaoPlanos',
];

export const MODULE_LABELS = {
  Dashboard: 'Painel Geral',
  Leads: 'Prospecção',
  Marketing: 'Campanhas',
  Oportunidades: 'Oportunidades',
  Contacts: 'Clientes',
  Accounts: 'Administradoras',
  Vendedores: 'Vendedores',
  VendasConsorcio: 'Vendas de Consórcio',
  Comissoes: 'Comissões',
  ProdutoConsorcio: 'Produtos de Consórcio',
  EquipeComercial: 'Equipe Comercial',
  Recebiveis: 'Recebíveis',
  RegrasComissao: 'Regras de Comissão',
  Reports: 'Relatórios Gerenciais',
  Settings: 'Configurações',
  GestaoAcessos: 'Gestão de Acessos',
  ConciliacaoAdministradora: 'Conciliação Administradora',
  GestaoEmpresas: 'Gestão de Empresas',
  GestaoPlanos: 'Gestão de Planos',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin_empresa: 'Admin Empresa',
  gestor_comercial: 'Gestor Comercial',
  lider_comercial: 'Líder Comercial',
  gestor_financeiro: 'Gestor Financeiro',
  vendedor: 'Vendedor',
  analista_plataforma: 'Analista Plataforma',
};

export const ROLE_MODULE_DEFAULTS = {
  super_admin: AVAILABLE_MODULES,
  admin_empresa: AVAILABLE_MODULES,
  gestor_comercial: ['Dashboard', 'Leads', 'Marketing', 'Oportunidades', 'Contacts', 'Accounts', 'EquipeComercial', 'Reports'],
  lider_comercial: ['Dashboard', 'Leads', 'Marketing', 'Oportunidades', 'Contacts', 'Accounts', 'EquipeComercial', 'Reports'],
  gestor_financeiro: ['Dashboard', 'Reports', 'Accounts'],
  vendedor: ['Dashboard', 'Leads', 'Oportunidades', 'Contacts'],
  analista_plataforma: ['Dashboard', 'Reports', 'Leads', 'Oportunidades'],
};

export const isAdminRole = (role) => role === 'super_admin' || role === 'admin_empresa';
