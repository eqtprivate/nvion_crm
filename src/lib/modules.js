export const AVAILABLE_MODULES = [
  'Dashboard',
  'Leads',
  'Oportunidades',
  'Contacts',
  'Accounts',
  'EquipeComercial',
  'Reports',
  'Settings',
  'GestaoAcessos',
];

export const MODULE_LABELS = {
  Dashboard: 'Painel Geral',
  Leads: 'Prospecção',
  Oportunidades: 'Oportunidades',
  Contacts: 'Clientes',
  Accounts: 'Administradoras',
  EquipeComercial: 'Equipe e Vendedores',
  Reports: 'Relatórios Gerenciais',
  Settings: 'Configurações',
  GestaoAcessos: 'Gestão de Acessos',
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
  gestor_comercial: ['Dashboard', 'Leads', 'Oportunidades', 'Contacts', 'Accounts', 'EquipeComercial', 'Reports'],
  lider_comercial: ['Dashboard', 'Leads', 'Oportunidades', 'Contacts', 'Accounts', 'EquipeComercial', 'Reports'],
  gestor_financeiro: ['Dashboard', 'Reports', 'Accounts'],
  vendedor: ['Dashboard', 'Leads', 'Oportunidades', 'Contacts'],
  analista_plataforma: ['Dashboard', 'Reports', 'Leads', 'Oportunidades'],
};

export const isAdminRole = (role) => role === 'super_admin' || role === 'admin_empresa';