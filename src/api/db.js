// ──────────────────────────────────────────────────────────────────────────
// Camada de dados sobre o Supabase com a MESMA interface do base44.entities,
// para minimizar mudanças nas telas:
//   db.Lead.list('-created_date'), db.Lead.create(data),
//   db.Lead.update(id, data), db.Lead.delete(id), db.Lead.bulkCreate([...])
//
// Multi-tenant: em criações, injeta empresa_id / empresa_vinculada / created_by
// a partir do perfil (profiles) do usuário autenticado. A RLS no Postgres
// garante o isolamento por empresa.
// ──────────────────────────────────────────────────────────────────────────
import { assertSupabaseConfigured } from '@/lib/supabaseClient';

// Entidade (base44) → tabela (Supabase)
const TABLES = {
  Account: 'accounts',
  Campanhas: 'campanhas',
  Comissoes: 'comissoes',
  ConciliacaoVenda: 'conciliacao_vendas',
  Contact: 'contacts',
  DefaultSettings: 'default_settings',
  EquipeComercial: 'equipes_comerciais',
  ImportacaoRelatorioAdministradora: 'importacoes_relatorio',
  Lead: 'leads',
  Opportunity: 'opportunities',
  ParcelasComissao: 'parcelas_comissao',
  ParcelasRegraComissao: 'parcelas_regra_comissao',
  Plano: 'planos',
  ProdutoConsorcio: 'produtos_consorcio',
  RecebiveisConsorcio: 'recebiveis_consorcio',
  RegrasComissao: 'regras_comissao',
  VendasConsorcio: 'vendas_consorcio',
  Vendedores: 'vendedores',
  // Já existentes na base de auth:
  Empresa: 'empresas',
  UsuarioAcesso: 'profiles',
  User: 'profiles',
};

// Tabelas que NÃO recebem injeção de empresa/created_by
const TENANT_FREE = new Set(['empresas', 'profiles']);

let _profileCache = null;

async function getProfile() {
  if (_profileCache) return _profileCache;
  const client = assertSupabaseConfigured();
  const { data: auth } = await client.auth.getUser();
  const authUser = auth?.user;
  if (!authUser) return null;
  const { data } = await client
    .from('profiles')
    .select('id, empresa_id, empresa_vinculada, role')
    .eq('id', authUser.id)
    .maybeSingle();
  _profileCache = data ? { ...data, user_id: authUser.id } : { user_id: authUser.id };
  return _profileCache;
}

/** Limpa o cache de perfil (chamar no login/logout). */
export function resetDbProfileCache() {
  _profileCache = null;
}

// base44 expunha `created_date`; no Supabase usamos `created_at`.
function withCreatedDate(row) {
  if (row && row.created_at != null && row.created_date === undefined) {
    return { ...row, created_date: row.created_at };
  }
  return row;
}

// Normaliza o campo de ordenação vindo do base44 ('-created_date', 'campo', '-campo').
function applyOrder(query, order) {
  if (!order || typeof order !== 'string') return query;
  const desc = order.startsWith('-');
  const field = (desc ? order.slice(1) : order).replace('created_date', 'created_at');
  return query.order(field, { ascending: !desc, nullsFirst: false });
}

function sanitizeWrite(payload) {
  const row = { ...(payload || {}) };
  delete row.created_date;
  delete row.created_at;
  delete row.updated_at;
  delete row.id;
  return row;
}

function makeTable(entityName) {
  const table = TABLES[entityName];
  const tenantFree = TENANT_FREE.has(table);
  const isEmpresas = table === 'empresas';

  const injectTenant = async (row) => {
    if (tenantFree) {
      // empresas exige `nome` (not null): espelha de razao_social/nome_fantasia
      if (isEmpresas && !row.nome) row.nome = row.razao_social || row.nome_fantasia || 'Empresa';
      return row;
    }
    const p = await getProfile();
    if (p) {
      if (row.empresa_id === undefined) row.empresa_id = p.empresa_id ?? null;
      if (row.empresa_vinculada === undefined && p.empresa_vinculada) row.empresa_vinculada = p.empresa_vinculada;
      if (row.created_by === undefined) row.created_by = p.user_id;
    }
    return row;
  };

  return {
    async list(order = '-created_at') {
      const client = assertSupabaseConfigured();
      const { data, error } = await applyOrder(client.from(table).select('*'), order);
      if (error) throw error;
      return (data || []).map(withCreatedDate);
    },

    async get(id) {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return withCreatedDate(data);
    },

    async create(payload) {
      const client = assertSupabaseConfigured();
      const row = await injectTenant(sanitizeWrite(payload));
      const { data, error } = await client.from(table).insert(row).select().single();
      if (error) throw error;
      return withCreatedDate(data);
    },

    async bulkCreate(items) {
      const client = assertSupabaseConfigured();
      const rows = [];
      for (const item of items || []) rows.push(await injectTenant(sanitizeWrite(item)));
      const { data, error } = await client.from(table).insert(rows).select();
      if (error) throw error;
      return (data || []).map(withCreatedDate);
    },

    async update(id, payload) {
      const client = assertSupabaseConfigured();
      const row = sanitizeWrite(payload);
      if (isEmpresas && Object.prototype.hasOwnProperty.call(row, 'razao_social') && !row.nome) {
        row.nome = row.razao_social || row.nome_fantasia || undefined;
      }
      const { data, error } = await client.from(table).update(row).eq('id', id).select().single();
      if (error) throw error;
      return withCreatedDate(data);
    },

    async delete(id) {
      const client = assertSupabaseConfigured();
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
  };
}

export const db = Object.fromEntries(Object.keys(TABLES).map((name) => [name, makeTable(name)]));

// Compatibilidade: `entities` espelha `db` (mesma forma de base44.entities).
export const entities = db;

export default db;
