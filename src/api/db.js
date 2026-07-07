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
import { logAudit } from '@/lib/audit';

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

// Colunas reais de cada tabela de negócio (fonte: migração 20260703000000).
// Usadas como whitelist na escrita: o Postgres rejeita coluna desconhecida, então
// descartamos campos que a tela envia mas a tabela não possui (ex.: campos de
// cálculo/legado do base44). Tabelas fora deste mapa (empresas/profiles) passam direto.
const TABLE_COLUMNS = {
  accounts: ['name', 'cnpj', 'contato', 'email', 'telefone', 'prazo_medio_pagamento', 'formato_relatorio', 'status', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  campanhas: ['nome_campanha', 'codigo_campanha', 'tipo_campanha', 'status_campanha', 'data_inicio', 'data_fim', 'orcamento_previsto', 'orcamento_realizado', 'meta_leads', 'meta_oportunidades', 'meta_vendas', 'meta_valor_cartas', 'produto_foco', 'administradora_foco', 'equipe_responsavel', 'responsavel', 'canal', 'origem', 'utm_source', 'utm_medium', 'utm_campaign', 'publico_alvo', 'descricao', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  comissoes: ['venda_vinculada', 'regra_comissao', 'regra_comissao_id', 'cliente', 'administradora', 'produto', 'vendedor', 'lider', 'equipe', 'origem', 'valor_carta', 'percentual_base', 'percentual_vendedor', 'percentual_lider', 'percentual_empresa', 'valor_comissao_total', 'valor_comissao_vendedor', 'valor_comissao_lider', 'valor_comissao_empresa', 'valor_comissao_confirmada', 'quantidade_parcelas', 'tem_parcelas', 'data_prevista_pagamento', 'data_confirmacao', 'data_pagamento', 'status_comissao', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  conciliacao_vendas: ['importacao_vinculada', 'venda_vinculada', 'comissao_vinculada', 'administradora', 'cliente_relatorio', 'cliente_interno', 'grupo', 'cota', 'cpf_cnpj', 'produto_relatorio', 'produto_interno', 'vendedor', 'lider', 'valor_carta_relatorio', 'valor_carta_interno', 'comissao_relatorio', 'comissao_interna', 'data_venda_relatorio', 'data_prevista_pagamento', 'status_conciliacao', 'divergencia_tipo', 'diferenca_valor_carta', 'diferenca_comissao', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  contacts: ['name', 'email', 'phone', 'cpf_cnpj', 'cidade', 'estado', 'origem', 'vendedor_responsavel', 'status', 'observacoes', 'documentos_anexados', 'empresa_vinculada', 'empresa_id', 'created_by'],
  default_settings: ['default_currency', 'default_lead_stage', 'default_account_tier', 'default_follow_up_days', 'default_calendar_view', 'first_day_of_week', 'empresa_vinculada', 'empresa_id', 'created_by'],
  equipes_comerciais: ['nome_equipe', 'lider_responsavel', 'vendedores_vinculados', 'meta_mensal', 'status', 'empresa_vinculada', 'empresa_id', 'created_by'],
  importacoes_relatorio: ['administradora', 'arquivo_nome', 'data_importacao', 'competencia', 'total_linhas', 'total_conciliado', 'total_divergente', 'total_nao_encontrado', 'status_importacao', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  leads: ['name', 'email', 'phone', 'origem', 'campanha', 'produto_interesse', 'valor_estimado_carta', 'administradora_interesse', 'vendedor_responsavel', 'lider_vinculado', 'temperatura', 'status', 'data_ultimo_contato', 'tipo_proxima_acao', 'data_proxima_acao', 'proxima_acao', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  opportunities: ['name', 'cliente_vinculado', 'lead_vinculado', 'vendedor', 'lider', 'administradora_pretendida', 'produto', 'valor_carta', 'previsao_fechamento', 'probabilidade', 'motivo_perda', 'status', 'stage', 'empresa_vinculada', 'empresa_id', 'created_by'],
  parcelas_comissao: ['comissao_vinculada', 'venda_vinculada', 'regra_comissao_vinculada', 'numero_parcela', 'percentual_parcela', 'valor_parcela_total', 'valor_parcela_vendedor', 'valor_parcela_lider', 'valor_parcela_empresa', 'data_prevista_pagamento', 'data_confirmacao', 'data_pagamento', 'status_parcela', 'gatilho_parcela', 'estornavel', 'motivo_estorno', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  parcelas_regra_comissao: ['regra_comissao_vinculada', 'numero_parcela', 'percentual_parcela', 'valor_fixo_parcela', 'dias_apos_venda', 'dias_apos_confirmacao', 'gatilho_parcela', 'estornavel', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  planos: ['ativo', 'descricao', 'label', 'max_usuarios', 'modulos', 'slug', 'empresa_vinculada', 'empresa_id', 'created_by'],
  produtos_consorcio: ['administradora_vinculada', 'nome_produto', 'categoria', 'percentual_comissao_padrao', 'prazo_medio_pagamento', 'status', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  recebiveis_consorcio: ['administradora', 'cliente', 'comissao_vinculada', 'data_prevista_recebimento', 'data_recebimento_real', 'elegivel_antecipacao', 'lider', 'motivo_inelegibilidade', 'numero_parcela', 'observacoes', 'produto', 'status_recebivel', 'total_parcelas', 'valor_carta', 'valor_recebivel', 'venda_vinculada', 'vendedor', 'empresa_vinculada', 'empresa_id', 'created_by'],
  regras_comissao: ['nome_regra', 'administradora', 'produto', 'tabela_comercial', 'categoria_produto', 'tipo_comissao', 'tipo_regra_comissao', 'base_calculo', 'percentual_total', 'percentual_base', 'valor_fixo_total', 'quantidade_parcelas_comissionaveis', 'forma_pagamento', 'comissao_min', 'comissao_max', 'possui_estorno', 'sem_estorno', 'percentual_estorno', 'parcela_referencia_estorno', 'prazo_pagamento_dias', 'prazo_primeiro_pagamento_dias', 'gatilho_pagamento', 'percentual_vendedor', 'percentual_lider', 'percentual_empresa', 'permitir_diferenca_manual', 'justificativa_diferenca', 'status', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  vendas_consorcio: ['cliente', 'oportunidade_vinculada', 'vendedor', 'lider', 'equipe', 'administradora', 'produto', 'grupo', 'cota', 'valor_carta', 'data_venda', 'percentual_comissao_prevista', 'valor_comissao_prevista', 'data_prevista_pagamento', 'status_operacional', 'status_conciliacao', 'status_financeiro', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
  vendedores: ['nome', 'email', 'telefone', 'cpf_cnpj', 'equipe', 'lider', 'tipo_vendedor', 'meta_mensal', 'status', 'data_inicio', 'observacoes', 'empresa_vinculada', 'empresa_id', 'created_by'],
};

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
  const allowed = TABLE_COLUMNS[table] ? new Set(TABLE_COLUMNS[table]) : null;

  // Mantém só colunas existentes na tabela (evita erro de coluna desconhecida no
  // Postgres). Tabelas sem whitelist (empresas/profiles) passam sem alteração.
  const pickColumns = (row) => {
    if (!allowed) return row;
    const out = {};
    for (const key of Object.keys(row)) if (allowed.has(key)) out[key] = row[key];
    return out;
  };

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
      const row = pickColumns(await injectTenant(sanitizeWrite(payload)));
      const { data, error } = await client.from(table).insert(row).select().single();
      if (error) throw error;
      void logAudit('create', { entity: entityName, entityId: data?.id, empresaId: data?.empresa_id ?? null });
      return withCreatedDate(data);
    },

    async bulkCreate(items) {
      const client = assertSupabaseConfigured();
      const rows = [];
      for (const item of items || []) rows.push(pickColumns(await injectTenant(sanitizeWrite(item))));
      const { data, error } = await client.from(table).insert(rows).select();
      if (error) throw error;
      void logAudit('bulk_create', { entity: entityName, metadata: { count: (data || []).length } });
      return (data || []).map(withCreatedDate);
    },

    async update(id, payload) {
      const client = assertSupabaseConfigured();
      const row = sanitizeWrite(payload);
      if (isEmpresas && Object.prototype.hasOwnProperty.call(row, 'razao_social') && !row.nome) {
        row.nome = row.razao_social || row.nome_fantasia || undefined;
      }
      const { data, error } = await client.from(table).update(pickColumns(row)).eq('id', id).select().single();
      if (error) throw error;
      void logAudit('update', { entity: entityName, entityId: id, empresaId: data?.empresa_id ?? null });
      return withCreatedDate(data);
    },

    async delete(id) {
      const client = assertSupabaseConfigured();
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
      void logAudit('delete', { entity: entityName, entityId: id });
      return { id };
    },
  };
}

export const db = Object.fromEntries(Object.keys(TABLES).map((name) => [name, makeTable(name)]));

// Compatibilidade: `entities` espelha `db` (mesma forma de base44.entities).
export const entities = db;

export default db;
