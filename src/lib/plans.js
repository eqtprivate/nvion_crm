import { AVAILABLE_MODULES } from './modules';

export const PLANOS = {
  essencial: {
    label: 'Essencial',
    max_usuarios: 5,
    modulos: [
      'Dashboard', 'Leads', 'Oportunidades', 'Contacts', 'Accounts',
      'Vendedores', 'VendasConsorcio', 'Comissoes', 'Settings',
    ],
  },
  profissional: {
    label: 'Profissional',
    max_usuarios: 15,
    modulos: [
      'Dashboard', 'Leads', 'Oportunidades', 'Contacts', 'Accounts',
      'Vendedores', 'VendasConsorcio', 'Comissoes', 'Settings',
      'ProdutoConsorcio', 'EquipeComercial', 'Recebiveis', 'RegrasComissao',
      'Reports', 'GestaoAcessos',
    ],
  },
  business: {
    label: 'Business',
    max_usuarios: 30,
    modulos: [
      'Dashboard', 'Leads', 'Oportunidades', 'Contacts', 'Accounts',
      'Vendedores', 'VendasConsorcio', 'Comissoes', 'Settings',
      'ProdutoConsorcio', 'EquipeComercial', 'Recebiveis', 'RegrasComissao',
      'Reports', 'GestaoAcessos', 'ConciliacaoAdministradora',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    max_usuarios: Infinity,
    modulos: [...AVAILABLE_MODULES],
  },
};

export const PLANO_KEYS = Object.keys(PLANOS);

export function getPlano(key) {
  return PLANOS[key] || null;
}
