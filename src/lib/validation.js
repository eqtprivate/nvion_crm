import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Validadores brasileiros
// ──────────────────────────────────────────────────────────────────────────

export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Valida CPF (11 dígitos) incluindo dígitos verificadores. */
export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const calcDigit = (slice) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i += 1) {
      sum += Number(slice[i]) * (slice.length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcDigit(cpf.slice(0, 9));
  const d2 = calcDigit(cpf.slice(0, 10));
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Valida CNPJ (14 dígitos) incluindo dígitos verificadores. */
export function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos iguais

  const calcDigit = (length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cnpj[i]) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(12);
  const d2 = calcDigit(13);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

/** Aceita CPF (11) ou CNPJ (14) válido. */
export function isValidCpfCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

/** Telefone BR: 10 (fixo) ou 11 (celular) dígitos. */
export function isValidPhoneBR(value) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** CEP: 8 dígitos. */
export function isValidCEP(value) {
  return onlyDigits(value).length === 8;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers de schema reutilizáveis
//   Campos opcionais aceitam string vazia (formulários controlados por useState).
// ──────────────────────────────────────────────────────────────────────────

const blank = (val) => val === '' || val == null;

/** String obrigatória (não vazia após trim). */
export const requiredString = (msg = 'Campo obrigatório') =>
  z.string({ required_error: msg }).trim().min(1, msg);

/** String opcional (permite vazio). */
export const optionalString = z.string().trim().optional();

/**
 * Email obrigatório — exige apenas presença (não bloqueia por formato),
 * para não impedir salvamento de registros existentes com e-mails legados.
 */
// eslint-disable-next-line no-unused-vars
export const requiredEmail = (msg = 'E-mail inválido') =>
  z.string({ required_error: 'E-mail obrigatório' }).trim().min(1, 'E-mail obrigatório');

/** Email opcional (não bloqueia por formato). */
export const optionalEmail = z.string().trim().optional();

/** Número opcional (string vazia → undefined). */
export const optionalNumber = z.preprocess(
  (v) => (blank(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Valor numérico inválido' }).optional(),
);

/** Número opcional não negativo. */
export const optionalNonNegativeNumber = z.preprocess(
  (v) => (blank(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Valor numérico inválido' }).min(0, 'Deve ser maior ou igual a 0').optional(),
);

/** Número obrigatório e positivo (string vazia → erro). */
export const requiredPositiveNumber = (msg = 'Informe um valor maior que zero') =>
  z.preprocess(
    (v) => (blank(v) ? undefined : Number(v)),
    z.number({ required_error: msg, invalid_type_error: msg }).positive(msg),
  );

/** Percentual opcional (0–100). */
export const optionalPercent = z.preprocess(
  (v) => (blank(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Percentual inválido' }).min(0, 'Mínimo 0%').max(100, 'Máximo 100%').optional(),
);

/**
 * CPF/CNPJ opcional — não bloqueia salvamento (dados legados/seed podem ter
 * documentos de teste ou incompletos). A máscara continua formatando o campo,
 * e `isValidCpfCnpj` segue disponível para avisos não bloqueantes.
 */
export const optionalCpfCnpj = z.string().optional();

/** Telefone BR opcional (não bloqueia por formato/comprimento). */
export const optionalPhone = z.string().optional();

/** CEP opcional (não bloqueia por formato). */
export const optionalCEP = z.string().optional();

/** Data opcional (não bloqueia; <input type="date"> já garante o formato). */
export const optionalDate = z.string().optional();

// ──────────────────────────────────────────────────────────────────────────
// Schemas por entidade (espelham os schemas do Base44)
// ──────────────────────────────────────────────────────────────────────────

export const leadSchema = z.object({
  name: requiredString('Nome é obrigatório'),
  email: optionalEmail,
  phone: optionalPhone,
  origem: z.enum(['indicacao', 'instagram', 'google', 'site', 'whatsapp', 'campanha_paga', 'base_propria', 'parceiro', 'evento', 'outro']).optional(),
  campanha: optionalString,
  produto_interesse: optionalString,
  valor_estimado_carta: optionalNonNegativeNumber,
  administradora_interesse: optionalString,
  vendedor_responsavel: optionalString,
  lider_vinculado: optionalString,
  temperatura: z.enum(['frio', 'morno', 'quente']).optional(),
  status: z.enum(['novo_contato', 'qualificacao', 'simulacao', 'proposta_enviada', 'documentacao', 'em_aprovacao', 'venda_concluida', 'perdida']).optional(),
  data_ultimo_contato: optionalDate,
  tipo_proxima_acao: optionalString,
  data_proxima_acao: optionalDate,
  proxima_acao: optionalString,
  observacoes: optionalString,
}).passthrough();

export const contactSchema = z.object({
  name: requiredString('Nome é obrigatório'),
  email: requiredEmail(),
  phone: optionalPhone,
  cpf_cnpj: optionalCpfCnpj,
  cidade: optionalString,
  estado: optionalString,
  origem: z.enum(['indicacao', 'instagram', 'google', 'site', 'whatsapp', 'campanha_paga', 'base_propria', 'parceiro', 'evento', 'outro']).optional(),
  vendedor_responsavel: optionalString,
  status: z.enum(['lead', 'em_negociacao', 'cliente_ativo', 'venda_concluida', 'perdido', 'inativo']).optional(),
  observacoes: optionalString,
}).passthrough();

export const accountSchema = z.object({
  name: requiredString('Nome da administradora é obrigatório'),
  cnpj: optionalCpfCnpj,
  contato: optionalString,
  email: optionalEmail,
  telefone: optionalPhone,
  prazo_medio_pagamento: optionalNonNegativeNumber,
  formato_relatorio: optionalString,
  status: z.enum(['ativa', 'inativa', 'em_analise', 'suspensa']).optional(),
  observacoes: optionalString,
}).passthrough();

export const opportunitySchema = z.object({
  name: requiredString('Nome da oportunidade é obrigatório'),
  cliente_vinculado: optionalString,
  lead_vinculado: optionalString,
  vendedor: optionalString,
  lider: optionalString,
  administradora_pretendida: optionalString,
  produto: optionalString,
  valor_carta: requiredPositiveNumber('Informe o valor da carta'),
  previsao_fechamento: optionalDate,
  probabilidade: optionalPercent,
  motivo_perda: optionalString,
  status: z.enum(['aberta', 'ganha', 'perdida', 'suspensa']).optional(),
  stage: z.enum(['novo_contato', 'qualificacao', 'simulacao', 'proposta_enviada', 'documentacao', 'em_aprovacao', 'venda_concluida', 'perdida']),
}).passthrough();

export const vendedorSchema = z.object({
  nome: requiredString('Nome do vendedor é obrigatório'),
  email: optionalEmail,
  telefone: optionalPhone,
  cpf_cnpj: optionalCpfCnpj,
  equipe: optionalString,
  lider: optionalString,
  tipo_vendedor: z.enum(['interno', 'parceiro', 'corban', 'lider']).optional(),
  meta_mensal: optionalNonNegativeNumber,
  status: z.enum(['ativo', 'inativo', 'suspenso']).optional(),
  data_inicio: optionalDate,
  observacoes: optionalString,
}).passthrough();

export const equipeSchema = z.object({
  nome_equipe: requiredString('Nome da equipe é obrigatório'),
  lider_responsavel: requiredString('Líder responsável é obrigatório'),
  meta_mensal: optionalNonNegativeNumber,
  status: z.enum(['ativa', 'inativa']).optional(),
  observacoes: optionalString,
}).passthrough();

export const vendaConsorcioSchema = z.object({
  cliente: requiredString('Cliente é obrigatório'),
  oportunidade_vinculada: optionalString,
  vendedor: optionalString,
  lider: optionalString,
  equipe: optionalString,
  administradora: optionalString,
  produto: optionalString,
  grupo: optionalString,
  cota: optionalString,
  valor_carta: requiredPositiveNumber('Informe o valor da carta'),
  data_venda: optionalDate,
  percentual_comissao_prevista: optionalPercent,
  valor_comissao_prevista: optionalNonNegativeNumber,
  data_prevista_pagamento: optionalDate,
  status_operacional: z.enum(['lancada', 'documentacao', 'em_aprovacao', 'aprovada', 'concluida', 'cancelada']).optional(),
  status_conciliacao: z.enum(['nao_conciliada', 'em_conciliacao', 'conciliada', 'divergente']).optional(),
  status_financeiro: z.enum(['comissao_prevista', 'comissao_paga', 'comissao_cancelada']).optional(),
  observacoes: optionalString,
}).passthrough();

export const regraComissaoSchema = z.object({
  nome_regra: requiredString('Nome da regra é obrigatório'),
  administradora: optionalString,
  produto: optionalString,
  tabela_comercial: optionalString,
  categoria_produto: optionalString,
  tipo_comissao: z.enum(['percentual', 'fixo', 'hibrido']).optional(),
  tipo_regra_comissao: z.enum(['percentual_fixo', 'percentual_parcelado_igual', 'percentual_parcelado_customizado', 'valor_fixo', 'hibrido', 'faixa_variavel']).optional(),
  base_calculo: z.enum(['valor_carta', 'valor_credito', 'taxa_administracao', 'valor_comissao_administradora', 'valor_manual']).optional(),
  percentual_total: optionalNonNegativeNumber,
  percentual_base: optionalNonNegativeNumber,
  valor_fixo_total: optionalNonNegativeNumber,
  quantidade_parcelas_comissionaveis: optionalNonNegativeNumber,
  forma_pagamento: z.enum(['a_vista', 'parcelado', 'customizado']).optional(),
  comissao_min: optionalNonNegativeNumber,
  comissao_max: optionalNonNegativeNumber,
  possui_estorno: z.boolean().optional(),
  sem_estorno: z.boolean().optional(),
  percentual_estorno: optionalNonNegativeNumber,
  parcela_referencia_estorno: optionalNonNegativeNumber,
  prazo_pagamento_dias: optionalNonNegativeNumber,
  prazo_primeiro_pagamento_dias: optionalNonNegativeNumber,
  gatilho_pagamento: z.enum(['venda_criada', 'venda_confirmada', 'conciliacao_confirmada', 'pagamento_administradora', 'pagamento_cliente']).optional(),
  percentual_vendedor: optionalNonNegativeNumber,
  percentual_lider: optionalNonNegativeNumber,
  percentual_empresa: optionalNonNegativeNumber,
  permitir_diferenca_manual: z.boolean().optional(),
  justificativa_diferenca: optionalString,
  status: z.enum(['ativa', 'inativa', 'suspensa', 'arquivada']).optional(),
  observacoes: optionalString,
}).passthrough();

export const produtoConsorcioSchema = z.object({
  nome_produto: requiredString('Nome do produto é obrigatório'),
  administradora_vinculada: optionalString,
  categoria: z.enum(['imovel', 'veiculo', 'pesados', 'servicos', 'agro', 'outros']).optional(),
  percentual_comissao_padrao: optionalNonNegativeNumber,
  prazo_medio_pagamento: optionalNonNegativeNumber,
  status: z.enum(['ativo', 'inativo']).optional(),
  observacoes: optionalString,
}).passthrough();

export const equipeComercialSchema = z.object({
  nome_equipe: requiredString('Nome da equipe é obrigatório'),
  lider_responsavel: optionalString,
  vendedores_vinculados: z.array(z.string()).optional(),
  meta_mensal: optionalNonNegativeNumber,
  status: z.enum(['ativo', 'inativo']).optional(),
}).passthrough();

export const empresaSchema = z.object({
  razao_social: requiredString('Razão social é obrigatória'),
  nome_fantasia: optionalString,
  cnpj: optionalCpfCnpj,
  responsavel_principal: optionalString,
  email: optionalEmail,
  telefone: optionalPhone,
  cep: optionalCEP,
  status: z.enum(['em_implantacao', 'ativa', 'em_analise', 'elegivel_para_credito', 'suspensa', 'inativa']).optional(),
  plano_contratado: optionalString,
  data_inicio_plataforma: optionalDate,
  elegivel_antecipacao: z.boolean().optional(),
  limite_atual_sugerido: optionalNonNegativeNumber,
  limite_utilizado: optionalNonNegativeNumber,
  limite_disponivel: optionalNonNegativeNumber,
  observacoes_internas: optionalString,
}).passthrough();

export const usuarioAcessoSchema = z.object({
  display_name: requiredString('Nome de exibição é obrigatório'),
  email: requiredEmail(),
  role: z.enum(['super_admin', 'admin_empresa', 'gestor_comercial', 'lider_comercial', 'gestor_financeiro', 'vendedor', 'analista_plataforma']).optional(),
  empresa_vinculada: optionalString,
  status: z.enum(['ativo', 'suspenso', 'pendente']).optional(),
}).passthrough();

export const planoSchema = z.object({
  slug: requiredString('Slug é obrigatório').regex(/^[a-z0-9_-]+$/, 'Use apenas letras minúsculas, números, "-" ou "_"'),
  label: requiredString('Nome do plano é obrigatório'),
  max_usuarios: optionalNonNegativeNumber,
  modulos: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
  descricao: optionalString,
}).passthrough();

export const campanhaSchema = z.object({
  nome_campanha: requiredString('Nome da campanha é obrigatório'),
  codigo_campanha: optionalString,
  tipo_campanha: z.enum(['digital', 'indicacao', 'parceria', 'evento', 'mailing', 'inbound', 'outbound', 'corban', 'institucional', 'outro']).optional(),
  status_campanha: z.enum(['rascunho', 'ativa', 'pausada', 'encerrada', 'cancelada']).optional(),
  canal: z.enum(['whatsapp', 'email', 'landing_page', 'trafego_pago', 'organic_social', 'parceiro', 'evento', 'telefone', 'outro']).optional(),
  data_inicio: optionalDate,
  data_fim: optionalDate,
  orcamento_previsto: optionalNonNegativeNumber,
  orcamento_realizado: optionalNonNegativeNumber,
  meta_leads: optionalNonNegativeNumber,
  meta_oportunidades: optionalNonNegativeNumber,
  meta_vendas: optionalNonNegativeNumber,
  meta_valor_cartas: optionalNonNegativeNumber,
}).passthrough().refine(
  (data) => !data.data_inicio || !data.data_fim || data.data_fim >= data.data_inicio,
  { message: 'A data fim deve ser igual ou posterior à data início', path: ['data_fim'] },
);

export const recebivelSchema = z.object({
  administradora: optionalString,
  cliente: optionalString,
  produto: optionalString,
  numero_parcela: optionalNonNegativeNumber,
  total_parcelas: optionalNonNegativeNumber,
  valor_recebivel: optionalNonNegativeNumber,
  valor_carta: optionalNonNegativeNumber,
  data_prevista_recebimento: optionalDate,
  data_recebimento_real: optionalDate,
  status_recebivel: z.enum(['previsto', 'confirmado', 'atrasado', 'recebido', 'cancelado']).optional(),
  elegivel_antecipacao: z.boolean().optional(),
  motivo_inelegibilidade: optionalString,
  observacoes: optionalString,
}).passthrough().refine(
  (data) => !data.numero_parcela || !data.total_parcelas || data.numero_parcela <= data.total_parcelas,
  { message: 'A parcela não pode ser maior que o total de parcelas', path: ['numero_parcela'] },
);

// ──────────────────────────────────────────────────────────────────────────
// Helper de validação para formulários controlados por useState
// ──────────────────────────────────────────────────────────────────────────

/**
 * Valida `data` contra `schema`.
 * @returns {{ ok: boolean, data: object|null, errors: Record<string,string> }}
 *   `errors` mapeia o caminho do campo (ex: "email") para a primeira mensagem.
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, errors: {} };

  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, data: null, errors };
}
