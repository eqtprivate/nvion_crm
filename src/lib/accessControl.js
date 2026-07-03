/**
 * Access control utilities for role-based data filtering.
 *
 * Hierarchy:
 *  super_admin / admin_empresa / gestor_comercial / gestor_financeiro / analista_plataforma
 *    → see all records of their company
 *  lider_comercial
 *    → sees records where they appear as lider, PLUS all records of vendedores in their team
 *  vendedor
 *    → sees only records where they appear as the responsible vendedor
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
/**
 * Filter records based on the logged-in user's role.
 *
 * @param {Array}  records        - Raw list from Base44
 * @param {Object} user           - Current user from AuthContext
 * @param {Object} opts
 * @param {string} opts.liderField    - Field name holding the lider (e.g. 'lider_vinculado')
 * @param {string} opts.vendedorField - Field name holding the vendedor (e.g. 'vendedor_responsavel')
 * @param {Array}  opts.teamMembers   - display_names of vendedores in the lider's team
 */
export function applyAccessFilter(records, user, { liderField, vendedorField, teamMembers = [] } = {}) {
  if (!user || !Array.isArray(records)) return records || [];

  if (user.role === 'super_admin') return records;

  // All non-super-admin roles are scoped to their company
  const byCompany = records.filter(r => r.empresa_vinculada === user.empresa_vinculada);

  if (['admin_empresa', 'gestor_comercial', 'gestor_financeiro', 'analista_plataforma'].includes(user.role)) {
    return byCompany;
  }

  const name = user.display_name;

  if (user.role === 'lider_comercial') {
    return byCompany.filter(r =>
      (liderField && r[liderField] === name) ||
      (vendedorField && teamMembers.includes(r[vendedorField]))
    );
  }

  if (user.role === 'vendedor') {
    if (!vendedorField) return byCompany;
    return byCompany.filter(r => r[vendedorField] === name);
  }

  return byCompany;
}

/**
 * React hook: returns display_names of vendedores in the lider's team.
 * Returns empty array for non-lider roles (avoids unnecessary query).
 */
export function useTeamMembers(user) {
  const isLider = user?.role === 'lider_comercial';
  const empresa = user?.empresa_vinculada;

  const { data: equipes = [] } = useQuery({
    queryKey: ['equipes', empresa],
    queryFn: async () => {
      const all = await db.EquipeComercial.list('-created_date');
      return all.filter(e => e.empresa_vinculada === empresa);
    },
    enabled: isLider && !!empresa,
  });

  return useMemo(() => {
    if (!isLider) return [];
    const minhaEquipe = equipes.find(e => e.lider_responsavel === user.display_name);
    return minhaEquipe?.vendedores_vinculados || [];
  }, [equipes, isLider, user?.display_name]);
}

/** Roles that see all company data without individual-level filtering. */
export function isCompanyWideRole(role) {
  return ['super_admin', 'admin_empresa', 'gestor_comercial', 'gestor_financeiro', 'analista_plataforma'].includes(role);
}
